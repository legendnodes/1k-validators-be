import Datastore from 'nedb';

import logger from './logger';
import {Address, Stash} from './types';

export default class Database {
  private _db: any;

  constructor(filename: string, autoload: boolean = true) {
    this._db = new Datastore({ filename, autoload });
  }

  /// Entry point for adding a new candidate.
  async addCandidate(name: string, stash: string) {
    logger.info(`(DB::addCandidate) Adding candidate ${name}`);

    const oldData = await this._queryOne({ name });
    if (!oldData) {
      logger.info(`(DB::addCandidate) Could not find candidate node ${name} - skipping`);
      return;
    }
    const newData = Object.assign(oldData, {
      stash,
    });
    return this._update({ name }, newData);
  }

  async addNominator(address: Address): Promise<boolean> {
    logger.info(`(DB::addNominator) Adding nominator ${address}`);
    const now = new Date().getTime();

    const oldData = await this._queryOne({ nominator: address });
    if (!oldData) {
      logger.info(`(DB::addNominator) ${address} seen for the first time`);
      const data = {
        nominator: address,
        current: [],
        nominatedAt: null,
        firstSeen: now,
        lastSeen: now,
      };

      return this._insert(data);
    }

    const newData = Object.assign(oldData, {
      lastSeen: now,
    });

    return this._update({ nominator: address }, newData);
  }

  async newTargets(address: Address, targets: Stash[]): Promise<boolean> {
    logger.info(`(DB::newTargets) Adding new targets for ${address} | targets: ${JSON.stringify(targets)}`);
    const now = new Date().getTime();

    const oldData = await this._queryOne({ nominator: address });
    const newData = Object.assign(oldData, {
      current: targets,
      nominatedAt: now,
      lastSeen: now,
    });

    return this._update({ nominator: address }, newData);
  }

  async getCurrentTargets(address: Address): Promise<Stash[]> {
    logger.info(`(DB::getCurrentTargets) Getting targets for ${address}`);
    
    //@ts-ignore
    return (await this._queryOne({ nominator: address })).current;
  }

  async setNominatedAt(stash: Stash, now: number) {
    logger.info(`(DB::setNominatedAt) Setting nominated at ${now}`);

    const oldData = await this._queryOne({ stash });
    const newData = Object.assign(oldData, {
      nominatedAt: now,
    });
    return this._update({ stash }, newData);
  }

  async setTarget(nominator: Address, stash: Stash, now: number) {
    logger.info(`(DB::setTarget) Setting target for nominator ${nominator} | stash = ${stash}`);

    const oldData = await this._queryOne({ nominator });
    const newData = Object.assign(oldData, {
      current: [...oldData.current, stash],
      nominatedAt: now,
      lastSeen: now, 
    });

    logger.info(`(DB::setTarget) OLDDATA ${JSON.stringify(oldData)} | NEWDATA ${JSON.stringify(newData)} | nominator ${nominator} | stash = ${stash}`);
    return this._update({ nominator }, newData);
  }

  /// Entry point for reporting a new node is online.
  async reportOnline(id: number, details: Array<any>) {
    const name = details[0];

    logger.info(`(DB::reportOnline) Reporting ${name} online.`)

    const now = new Date().getTime();
    const oldData = await this._queryOne({ id });

    if (!oldData) {
      /// First time we're seeing the node.
      const data = {
        id,
        name,
        details,
        connectedAt: now,
        nominatedAt: 0,
        goodSince: now,
        offlineSince: 0,
        offlineAccumulated: 0,
        rank: 0,
        misbehaviors: 0,
        stash: null,
      };
      return this._insert(data); 
    } else {
      /// We've seen the node before, take stock of any offline time.
      const timeOffline = now - Number(oldData.offlineSince);
      const accumulated = Number(oldData.offlineAccumulated) + timeOffline;
      const newData = Object.assign(oldData, {
        offlineSince: 0,
        offlineAccumulated: accumulated,
      });
      return this._update({ id }, newData);
    }
  }

  async reportOffline(id: number) {
    const now = new Date().getTime();
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      offlineSince: now,
    });

    return this._update({ id }, newData);
  }

  async nodeGood(id: number, now: number) {
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      goodSince: now,
    });

    return this._update({ id }, newData);
  }

  async nodeNotGood(id: number) {
    const oldData = await this._queryOne({ id });
    const newData = Object.assign(oldData, {
      goodSince: 0,
    });

    return this._update({ id }, newData);
  }

  async allNodes(): Promise<any[]> {
    return new Promise((resolve: any, reject: any) => {
      this._db.find({ id: { $gte: 0 } }, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  async getValidator(stash: Stash) {
    return this._queryOne({ stash });
  }

  async setValidator(stash: Stash, data: object) {
    if (!(await this._queryOne({ stash }))) {
      return this._insert({ data });
    }
    return this._update({ stash }, data);
  }

  async allValidators() {
    return null;
  }

  async allNominators() {
    return new Promise((resolve: any, reject: any) => {
    this._db.find({ nominator: /.*/ }, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs);
      });
    });
  }

  /// Insert new item in the datastore.
  private _insert(item: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._db.insert(item, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Update an item in the datastore.
  private _update(item: object, data: object): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._db.update(item, data, (err: any) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  /// Get an item from the datastore.
  private _queryOne(item: object): Promise<any> {
    return new Promise((resolve, reject) => {
      this._db.find(item, (err: any, docs: any) => {
        if (err) reject(err);
        resolve(docs[0]);
      });
    });
  }
}