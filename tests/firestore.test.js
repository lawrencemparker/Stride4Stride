const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

// Read the local rules file
// explicit path join ensures it finds the file on Windows correctly
const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');

let testEnv;

beforeAll(async () => {
  // Initialize the emulator environment with your rules
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-shoes-test',
    firestore: { 
      rules,
      host: '127.0.0.1', // Explicitly pointing to localhost
      port: 8080         // Explicitly pointing to the port from your screenshot
    },
  });
});

afterAll(async () => {
  // Clean up the environment after tests finish
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  // Clear the database before every individual test
  if (testEnv) await testEnv.clearFirestore();
});

describe('Shoes Collection Security', () => {
  
  it('should prevent a user from updating someone else\'s shoe document', async () => {
    // 1. Setup: Create a shoe document owned by "alice"
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('shoes')
        .doc('shoe_123')
        .set({
          userId: 'alice',
          brand: 'Nike',
          model: 'Pegasus 39',
          mileage: 50
        });
    });

    // 2. Act: Authenticate as "bob" (a different user)
    const bobDb = testEnv.authenticatedContext('bob').firestore();

    // 3. Assert: Bob tries to update Alice's shoe
    await assertFails(
      bobDb.collection('shoes').doc('shoe_123').update({
        mileage: 100 
      })
    );
  });

  it('should allow a user to update their own shoe document', async () => {
    // 1. Setup: Create a shoe document owned by "alice"
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore()
        .collection('shoes')
        .doc('shoe_123')
        .set({
          userId: 'alice',
          brand: 'Nike',
          model: 'Pegasus 39',
          mileage: 50
        });
    });

    // 2. Act: Authenticate as "alice"
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    // 3. Assert: Alice tries to update her own shoe
    await assertSucceeds(
      aliceDb.collection('shoes').doc('shoe_123').update({
        mileage: 60
      })
    );
  });
});