import { logger, Db, ChainData } from "@1kv/common";

export const validatorPrefJob = async (db, chaindata: ChainData) => {
  const start = Date.now();

  const candidates = await db.allCandidates();

  for (const candidate of candidates) {
    // Set Identity
    const identity = await chaindata.getFormattedIdentity(candidate.stash);
    await db.setIdentity(candidate.stash, identity);

    // Set Commission
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    const formattedCommission =
      commission == 0 ? 0 : commission / Math.pow(10, 7);
    await db.setCommission(candidate.stash, formattedCommission);

    // Set Controller
    const controller = await chaindata.getControllerFromStash(candidate.stash);
    await db.setController(candidate.stash, controller);

    // Set reward destination
    const rewardDestination = await chaindata.getRewardDestination(
      candidate.stash
    );
    await db.setRewardDestination(candidate.stash, rewardDestination);

    // set bonded amount
    const [bonded, err2] = await chaindata.getBondedAmount(candidate.stash);
    await db.setBonded(candidate.stash, bonded);
  }

  const end = Date.now();

  logger.info(
    `{cron::ValidatorPrefJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const processValidatorPrefJob = async (
  job: any,
  db: Db,
  chaindata: ChainData
) => {
  logger.info(`Processing Validator Pref Job....`);
  await validatorPrefJob(db, chaindata);
};
