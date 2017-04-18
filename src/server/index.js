import cluster from 'cluster';
import fs from 'fs';

import settings from '../shared/settings';

import Server from './Server';
import Trainer from './Trainer';
import SynapticTrainer from './SynapticTrainer';

if (cluster.isMaster) {
  let server = new Server();

  cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', server.onMessage);
  }
}else{

  let trainer = new Trainer({
    batch_size: settings.batch_size,
    refresh_batch: settings.refresh_batch
  });
  console.log('worker');
  trainer.train(batch => {
    process.send(batch);
  });

/*
 let trainer2 = new SynapticTrainer();
 trainer2.train(batch => {
   process.send(batch);
 });*/
}
