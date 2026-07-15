import { MongoMemoryServer } from 'mongodb-memory-server';

console.log("Starting MongoMemoryServer...");
try {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'itrack',
      ip: '127.0.0.1',
    }
  });

  const uri = mongod.getUri();
  console.log(`MongoMemoryServer running at: ${uri}`);
  console.log("Press Ctrl+C to stop.");

  // Keep process alive
  await new Promise(() => {});
} catch (err) {
  console.error("Failed to start MongoMemoryServer:", err);
  process.exit(1);
}
