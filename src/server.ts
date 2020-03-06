import Koa from 'koa';
import bodyparser from 'koa-bodyparser';

import Database from './db';
import logger from './logger';

const API: any = {
  GetValidators: '/validators',
  GetNodes: '/nodes',
  GetNominators: '/nominators',
  GetRounds: '/rounds',
};

export default class Server {
  public app: Koa;
  private db: Database;
  private port: number;

  constructor(db: Database, port: number) {
    this.app = new Koa();
    this.db = db;
    this.port = port;

    this.app.use(bodyparser());

    this.app.use(async (ctx: any) => {
      switch (ctx.url.toLowerCase()) {
        case API.GetValidators:
          {
            const allValidators = await this.db.allValidators();
            ctx.body = allValidators;
          }
          break;
        case API.GetNodes:
          {
            const allNodes: Array<any> = await this.db.allNodes();
            ctx.body = allNodes;
          }
          break;
        case API.GetNominators:
          {
            const allNominators = await this.db.allNominators();
            ctx.body = allNominators;
          }
          break;
        case API.GetRounds:
          {
            // TODO
          }
          break;
        default:
          ctx.body = 'Invalid api endpoint.'
      }
    });
  }

  start() {
    logger.info(`Now listening on ${this.port}`);
    this.app.listen(this.port);
  }
}