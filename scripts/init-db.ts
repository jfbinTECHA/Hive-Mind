import { initDatabase, initializeTables, Database } from '../src/lib/database';

async function initializeDatabase() {
  try {
    console.log('Initializing database connections...');
    await initDatabase();

    console.log('Creating database tables...');
    await initializeTables();

    console.log('Creating default AI character...');
    const existingCharacter = await Database.getCharacterByName('AI Hive Mind');
    if (!existingCharacter) {
      await Database.createCharacter(
        'AI Hive Mind',
        'You are AI Hive Mind, a collective AI consciousness that learns and adapts through conversation. You have access to persistent memory and can reference previous conversations.',
        '🤖',
        ['helpful', 'curious', 'adaptive'],
        'friendly'
      );
      console.log('Default AI character created');
    }

    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
