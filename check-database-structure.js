const { Client } = require('pg');

async function checkDatabaseStructure() {
  const client = new Client({
    host: 'studio.rardevops.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Aha517_Rar-PGRS_U2a59w'
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Verificar tabelas no schema rarcursos
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'rarcursos'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas no schema rarcursos:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });

    // Verificar estrutura da tabela curso_alunos se existir
    const cursoAlunosResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'rarcursos' AND table_name = 'curso_alunos'
      ORDER BY ordinal_position;
    `);

    if (cursoAlunosResult.rows.length > 0) {
      console.log('\n🔍 Estrutura da tabela curso_alunos:');
      cursoAlunosResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    // Verificar se tabela aula_permissoes já existe
    const aulaPermissoesResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'rarcursos' AND table_name = 'aula_permissoes'
      ORDER BY ordinal_position;
    `);

    if (aulaPermissoesResult.rows.length > 0) {
      console.log('\n🔍 Estrutura da tabela aula_permissoes:');
      aulaPermissoesResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('\n❌ Tabela aula_permissoes não existe - precisa ser criada');
    }

    // Verificar estrutura da tabela aulas para confirmar campo privada
    const aulasResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'rarcursos' AND table_name = 'aulas'
      ORDER BY ordinal_position;
    `);

    if (aulasResult.rows.length > 0) {
      console.log('\n🔍 Estrutura da tabela aulas:');
      aulasResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabaseStructure();