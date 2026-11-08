use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
declare_id!("E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i");

#[program]
pub mod task_escrow {
    use super::*;
    pub fn create_task(ctx: Context<CreateTask>, nonce: u64, specification_hash: [u8;32], suite_hash: [u8;32], budget: u64, deadline: i64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(budget > 0 && budget <= 100_000_000, EscrowError::Budget);
        require!(deadline > now && deadline <= now + 86_400, EscrowError::Deadline);
        let recipient_rent = Rent::get()?.minimum_balance(0);
        require!(ctx.accounts.worker.data_is_empty() && ctx.accounts.reviewer.data_is_empty() && ctx.accounts.worker.lamports() >= recipient_rent && ctx.accounts.reviewer.lamports() >= recipient_rent, EscrowError::RecipientFunding);
        // Separate identities avoid duplicate mutable destinations and misleading self-payments.
        require!(ctx.accounts.worker.key() != ctx.accounts.reviewer.key() && ctx.accounts.worker.key() != ctx.accounts.creator.key() && ctx.accounts.reviewer.key() != ctx.accounts.creator.key(), EscrowError::Recipients);
        let task = &mut ctx.accounts.task;
        task.creator = ctx.accounts.creator.key(); task.worker = ctx.accounts.worker.key(); task.reviewer = ctx.accounts.reviewer.key();
        task.nonce = nonce; task.specification_hash = specification_hash; task.suite_hash = suite_hash;
        task.budget = budget; task.deadline = deadline; task.policy_version = 1; task.bump = ctx.bumps.task;
        transfer(CpiContext::new(ctx.accounts.system_program.key(), Transfer {from:ctx.accounts.creator.to_account_info(),to:task.to_account_info()}), budget)?;
        Ok(())
    }
    pub fn record_review(ctx: Context<CreatorTask>, solution_hash: [u8;32], probability_bps: u16) -> Result<()> {
        let task = &mut ctx.accounts.task;
        task.check_open(Clock::get()?.unix_timestamp)?;
        require!(!task.review_committed, EscrowError::Committed);
        require!(probability_bps <= 10_000, EscrowError::Probability);
        task.solution_hash = solution_hash; task.probability_bps = probability_bps; task.review_committed = true;
        Ok(())
    }
    pub fn settle_task(ctx: Context<SettleTask>, all_pass: bool, report_hash: [u8;32]) -> Result<()> {
        let task = &ctx.accounts.task;
        task.check_open(Clock::get()?.unix_timestamp)?;
        require!(task.review_committed, EscrowError::Uncommitted);
        let (worker, reviewer, refund) = payouts(task.budget, task.probability_bps, all_pass);
        pay(&task.to_account_info(), &ctx.accounts.worker.to_account_info(), worker)?;
        pay(&task.to_account_info(), &ctx.accounts.reviewer.to_account_info(), reviewer)?;
        pay(&task.to_account_info(), &ctx.accounts.creator.to_account_info(), refund)?;
        let task = &mut ctx.accounts.task;
        task.status = 1; task.all_pass = all_pass; task.report_hash = report_hash;
        Ok(())
    }
    pub fn cancel_task(ctx: Context<CreatorTask>) -> Result<()> {
        let task = &ctx.accounts.task;
        task.check_open(Clock::get()?.unix_timestamp)?;
        require!(!task.review_committed, EscrowError::Committed);
        pay(&task.to_account_info(), &ctx.accounts.creator.to_account_info(), task.budget)?;
        ctx.accounts.task.status = 2; Ok(())
    }
    pub fn refund_expired(ctx: Context<CreatorTask>) -> Result<()> {
        let task = &ctx.accounts.task;
        require!(task.status == 0, EscrowError::Terminal);
        require!(Clock::get()?.unix_timestamp >= task.deadline, EscrowError::NotExpired);
        pay(&task.to_account_info(), &ctx.accounts.creator.to_account_info(), task.budget)?;
        ctx.accounts.task.status = 3; Ok(())
    }
}

pub fn payouts(budget:u64, p:u16, pass:bool) -> (u64,u64,u64) {
    let reserve = budget / 5;
    let distance = if pass {10_000u128 - p as u128} else {p as u128};
    let reviewer = (reserve as u128 * (100_000_000 - distance * distance) / 100_000_000) as u64;
    let worker = if pass {budget - reserve} else {0};
    (worker, reviewer, budget - worker - reviewer)
}
fn pay(from:&AccountInfo, to:&AccountInfo, amount:u64) -> Result<()> {
    let reserve = Rent::get()?.minimum_balance(from.data_len());
    require!(from.lamports().checked_sub(amount).is_some_and(|left| left >= reserve), EscrowError::Reserve);
    from.sub_lamports(amount)?; to.add_lamports(amount)?; Ok(())
}

#[derive(Accounts)]
#[instruction(nonce:u64)]
pub struct CreateTask<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    pub worker: SystemAccount<'info>,
    pub reviewer: SystemAccount<'info>,
    #[account(init, payer=creator, space=8+Task::INIT_SPACE, seeds=[b"task",creator.key().as_ref(),&nonce.to_le_bytes()],bump)]
    pub task: Account<'info, Task>,
    pub system_program: Program<'info,System>,
}
#[derive(Accounts)]
pub struct CreatorTask<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(mut,has_one=creator,seeds=[b"task",creator.key().as_ref(),&task.nonce.to_le_bytes()],bump=task.bump)] pub task: Account<'info,Task>,
}
#[derive(Accounts)]
pub struct SettleTask<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(mut,has_one=creator,has_one=worker,has_one=reviewer,seeds=[b"task",creator.key().as_ref(),&task.nonce.to_le_bytes()],bump=task.bump)] pub task: Account<'info,Task>,
    /// CHECK: Address constrained to immutable task recipient.
    #[account(mut)] pub worker: UncheckedAccount<'info>,
    /// CHECK: Address constrained to immutable task recipient.
    #[account(mut)] pub reviewer: UncheckedAccount<'info>,
}
#[account]
#[derive(InitSpace)]
pub struct Task {
    pub creator:Pubkey, pub worker:Pubkey, pub reviewer:Pubkey, pub nonce:u64,
    pub specification_hash:[u8;32], pub suite_hash:[u8;32], pub budget:u64, pub deadline:i64,
    pub solution_hash:[u8;32], pub probability_bps:u16, pub review_committed:bool,
    pub report_hash:[u8;32], pub all_pass:bool, pub status:u8, pub policy_version:u8, pub bump:u8,
}
impl Task {
    fn check_open(&self, now:i64)->Result<()> {
        require!(self.status == 0,EscrowError::Terminal);
        require!(now < self.deadline,EscrowError::Deadline); Ok(())
    }
}
#[error_code]
pub enum EscrowError {
    #[msg("Budget must be 1..100000000 lamports")] Budget,
    #[msg("Deadline invalid or expired")] Deadline,
    #[msg("Recipients must be distinct")] Recipients,
    #[msg("Task is terminal")] Terminal,
    #[msg("Review is already committed")] Committed,
    #[msg("Review must be committed")] Uncommitted,
    #[msg("Probability exceeds 10000 bps")] Probability,
    #[msg("Task has not expired")] NotExpired,
    #[msg("Rent reserve would be depleted")] Reserve,
    #[msg("Payout wallets must be existing rent-exempt system accounts")] RecipientFunding,
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn arithmetic_exhaustive() {
        for b in [1,4,5,7,10_000_001,100_000_000] { for p in 0..=10_000 { for pass in [true,false] {
            let (w,r,c)=payouts(b,p,pass); assert_eq!(w+r+c,b); assert!(r<=b/5); assert_eq!(w,if pass {b-b/5}else{0});
        }}}
        assert_eq!(payouts(10_000_000,0,false),(0,2_000_000,8_000_000));
        assert_eq!(payouts(10_000_000,10_000,true),(8_000_000,2_000_000,0));
    }
}
