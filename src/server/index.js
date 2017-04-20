import cluster from 'cluster';
import fs from 'fs';

import settings from '../shared/settings';

import Server from './Server';
import Trainer from './Trainer';

if (cluster.isMaster) {
  let server = new Server();

  let trainingCluster = cluster.fork();
  let samplingCluster = cluster.fork();

  samplingCluster.on('message', server.onMessage);

  //send updated model to sampling process
  trainingCluster.on('message', message => {
    samplingCluster.send({
      action: 'sample',
      ...message
    });
  });


  trainingCluster.send({
    action: 'train'
  });

}else{

  let trainer = new Trainer({
    batch_size: settings.batch_size,
    refresh_batch: settings.refresh_batch
  });

  process.on('message', message => {

    if(message.action === 'sample'){
      console.log('sample');
      //trainer.loadModel(message.model);
      trainer.generateChunkFromModel(message.ticks)
      .then(chunk => {
        process.send(chunk);
      });
    }

    if(message.action === 'train'){
      trainer.train(batch => {
        process.send(batch);
      });
    }
  });

/*
 let trainer2 = new SynapticTrainer();
 trainer2.train(batch => {
   process.send(batch);
 });*/
}
