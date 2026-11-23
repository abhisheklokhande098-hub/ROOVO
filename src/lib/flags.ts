/** Launch switch: while false, paid plans show "opening soon" and nobody can request them. Turn on when your business registration and bank account are ready. */
export const paidPlansOpen = () => process.env.PAID_PLANS_OPEN === 'true';
