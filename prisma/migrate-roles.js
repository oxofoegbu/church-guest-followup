// Run this BEFORE prisma db push to safely convert the role column from enum to text
// Usage: node prisma/migrate-roles.js

const { Client } = require('pg');

async function migrate() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL or DIRECT_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString: url.replace('?pgbouncer=true', '') });
  await client.connect();

  try {
    // Check if column is still an enum
    const res = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    const dataType = res.rows[0]?.data_type;
    console.log('Current role column type:', dataType);

    if (dataType === 'USER-DEFINED') {
      console.log('Converting role column from enum to text...');
      
      // Convert the column
      await client.query(`ALTER TABLE users ALTER COLUMN role TYPE text USING role::text`);
      console.log('✓ Column converted to text');
      
      // Drop the old enum type
      await client.query(`DROP TYPE IF EXISTS "UserRole" CASCADE`);
      console.log('✓ Old enum type dropped');

      // Set default
      await client.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'VOLUNTEER'`);
      console.log('✓ Default set to VOLUNTEER');
    } else {
      console.log('Column is already text, no migration needed');
    }

    // Ensure custom_roles setting exists
    await client.query(`
      INSERT INTO app_settings (key, value, "updatedAt") 
      VALUES ('custom_roles', '[]', NOW()) 
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✓ custom_roles setting ensured');

    console.log('\nMigration complete! Now run: npx prisma@5.22.0 db push');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await client.end();
  }
}

migrate();
