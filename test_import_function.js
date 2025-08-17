// Teste simples para verificar se a função está sendo exportada
const { buscarCursoPorId } = require('./app/meus-cursos/actions.ts');

console.log('Função buscarCursoPorId:', typeof buscarCursoPorId);

if (typeof buscarCursoPorId === 'function') {
  console.log('✅ Função encontrada e é do tipo function');
} else {
  console.log('❌ Função não encontrada ou não é function');
  console.log('Tipo:', typeof buscarCursoPorId);
}