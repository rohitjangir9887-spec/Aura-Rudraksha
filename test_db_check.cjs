async function run() {
  const { db } = await import('./src/lib/db.js');
  console.log(await db.checkDbHealth());
}
run().catch(console.error);
