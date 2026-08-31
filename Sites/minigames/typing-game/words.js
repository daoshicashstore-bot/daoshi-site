// ===== BANCO DE PALAVRAS (500+ palavras brasileiras de 2 a 10 letras) =====

const WORD_BANK = [
  // 2 letras
  'ai', 'ao', 'as', 'eu', 'já', 'lá', 'má', 'na', 'no', 'nu', 'os', 'ou', 'pé', 'pó', 'se', 'si', 'só', 'tu', 'um', 'vá',
  
  // 3 letras
  'água', 'ano', 'até', 'bem', 'boa', 'bom', 'cão', 'céu', 'chá', 'cor', 'dar', 'dez', 'dia', 'dos', 'ela', 'ele', 'era', 'for', 'gás', 'góis', 'gol', 'ido', 'lar', 'lei', 'luz', 'lá', 'mãe', 'mar', 'mas', 'mau', 'mel', 'meu', 'mil', 'não', 'nem', 'nós', 'óis', 'pão', 'par', 'paz', 'põe', 'por', 'pôr', 'prá', 'pré', 'pró', 'que', 'rei', 'réu', 'rio', 'rua', 'sal', 'são', 'sei', 'sem', 'ser', 'seu', 'sim', 'sol', 'sou', 'tal', 'têm', 'ter', 'teu', 'tio', 'tom', 'top', 'tu', 'tão', 'uma', 'vai', 'vão', 'ver', 'vir', 'vós', 'vez',
  
  // 4 letras
  'água', 'alma', 'alto', 'amor', 'anjo', 'aqui', 'área', 'arte', 'azar', 'azul', 'bala', 'base', 'belo', 'bico', 'boca', 'bola', 'bolo', 'bota', 'café', 'cair', 'cama', 'casa', 'cedo', 'cela', 'cena', 'chão', 'cima', 'copa', 'corpo', 'coxa', 'cruz', 'dado', 'dano', 'data', 'dedo', 'dele', 'dele', 'deus', 'dois', 'doce', 'dono', 'dor', 'dose', 'duas', 'duro', 'face', 'faca', 'fada', 'fama', 'fase', 'fato', 'feia', 'feio', 'fiel', 'filho', 'final', 'fita', 'fogo', 'fome', 'fone', 'força', 'forma', 'forte', 'foto', 'frio', 'gato', 'gelo', 'gente', 'gesto', 'girar', 'gola', 'gosto', 'gota', 'graça', 'grau', 'grito', 'guia', 'hoje', 'hora', 'ideia', 'ilha', 'isso', 'lado', 'lago', 'lama', 'lata', 'leão', 'leite', 'lema', 'lento', 'letra', 'leve', 'lima', 'linha', 'lista', 'lixo', 'lobo', 'loja', 'louco', 'lugar', 'luxo', 'mala', 'mapa', 'mas', 'massa', 'mato', 'meio', 'mesa', 'mesmo', 'mestre', 'metal', 'metro', 'mexer', 'milha', 'mito', 'moça', 'moda', 'modo', 'mola', 'monte', 'moral', 'morte', 'mosca', 'moto', 'muito', 'mundo', 'muro', 'nada', 'nome', 'nota', 'nova', 'nove', 'novo', 'nuca', 'nunca', 'obra', 'ócio', 'oito', 'olá', 'olhar', 'olho', 'onda', 'ontem', 'ouro', 'outro', 'pai', 'pais', 'palha', 'palma', 'pano', 'papel', 'papo', 'para', 'pardo', 'parte', 'passo', 'pasta', 'pato', 'peão', 'pega', 'pegar', 'peito', 'peixe', 'pela', 'pele', 'pelo', 'pena', 'pente', 'perda', 'pessoa', 'pico', 'pilar', 'pilha', 'pino', 'pior', 'piso', 'plano', 'pobre', 'poder', 'poço', 'poeta', 'pois', 'polir', 'pomba', 'ponta', 'ponte', 'ponto', 'popa', 'porta', 'porto', 'posse', 'poste', 'pote', 'pouco', 'povo', 'praça', 'prado', 'prata', 'prato', 'praxe', 'prazo', 'prece', 'preço', 'pregar', 'prenda', 'presa', 'preso', 'prete', 'preto', 'prezo', 'prima', 'prior', 'proa', 'probo', 'prosa', 'prova', 'prumo', 'pudor', 'pulga', 'pulo', 'pulso', 'punho', 'puro', 'quer', 'quilo', 'raça', 'raio', 'raiva', 'ramo', 'rapto', 'raro', 'raso', 'rato', 'razão', 'real', 'redor', 'regra', 'reino', 'resto', 'reto', 'réu', 'rico', 'rir', 'risco', 'riso', 'ritmo', 'roda', 'roer', 'rolo', 'rosto', 'rota', 'roxo', 'ruído', 'ruim', 'ruma', 'rumo', 'rural', 'saber', 'sabor', 'saco', 'sagaz', 'saia', 'saída', 'sala', 'salão', 'salgar', 'salsa', 'salto', 'salva', 'salvar', 'samba', 'sangue', 'santo', 'sapo', 'sarna', 'secar', 'seco', 'seda', 'sede', 'sediar', 'seio', 'seja', 'sela', 'selar', 'selo', 'selva', 'sempre', 'senão', 'senda', 'senhor', 'senha', 'senso', 'sente', 'sequer', 'será', 'serão', 'sério', 'serra', 'sesta', 'sete', 'seu', 'sexo', 'sexta', 'sido', 'sigla', 'signo', 'silva', 'sim', 'sinal', 'sino', 'siso', 'sitio', 'sítio', 'sobra', 'sobre', 'soco', 'sogra', 'sogro', 'soja', 'solda', 'soldo', 'sósia', 'sótão', 'subir', 'sujar', 'sumo', 'suor', 'supra', 'surdo', 'surto', 'tábua', 'taça', 'taco', 'talão', 'talha', 'talho', 'talvez', 'tango', 'tanto', 'tarde', 'tarefa', 'tato', 'taxa', 'tear', 'tece', 'teia', 'tema', 'tempo', 'tenda', 'tênue', 'ter', 'terça', 'termo', 'terra', 'tese', 'teso', 'teste', 'teto', 'tia', 'time', 'tinta', 'tipo', 'tira', 'tirar', 'tiro', 'toada', 'toalha', 'tocar', 'toda', 'todo', 'toldo', 'tolo', 'tomar', 'tombo', 'tomo', 'tonelada', 'topo', 'toque', 'torcer', 'torna', 'torno', 'torpe', 'torre', 'torso', 'torta', 'torto', 'tosse', 'tosco', 'tosto', 'total', 'touca', 'toucinho', 'touro', 'traça', 'trago', 'trair', 'trança', 'trato', 'travar', 'travo', 'trazer', 'trecho', 'trégua', 'treino', 'trem', 'trepar', 'trevo', 'tribo', 'trilha', 'triplo', 'triste', 'triturar', 'triunfo', 'troca', 'troco', 'tromba', 'tronco', 'trono', 'tropa', 'tropeço', 'trotar', 'trote', 'trova', 'trovoada', 'trucar', 'truque', 'tubo', 'tudo', 'tumba', 'tumor', 'túnel', 'turba', 'turma', 'turno', 'turvo', 'última', 'último', 'umbral', 'umedecer', 'unha', 'união', 'único', 'unir', 'uns', 'urgir', 'urna', 'urrar', 'urso', 'usar', 'uso', 'útil', 'uva', 'vácuo', 'vaga', 'vagar', 'vago', 'vaiar', 'vale', 'valer', 'valor', 'valsa', 'válvula', 'vão', 'vapor', 'vara', 'varal', 'varão', 'varrer', 'vaso', 'vazar', 'vazio', 'vedar', 'vedete', 'veio', 'veia', 'vela', 'velar', 'velha', 'velho', 'veloz', 'vencer', 'venda', 'vender', 'veneno', 'vento', 'verão', 'verba', 'verde', 'vergonha', 'verme', 'verso', 'vespa', 'veste', 'vestir', 'véu', 'viagem', 'vias', 'viço', 'vida', 'vidro', 'viés', 'vigiar', 'vila', 'vime', 'vinco', 'vinda', 'vingar', 'vinho', 'vinte', 'viola', 'violar', 'virar', 'virgem', 'viril', 'virtude', 'vírus', 'visar', 'visão', 'visar', 'visita', 'visto', 'viúva', 'viúvo', 'viva', 'viver', 'vivo', 'vizinho', 'voar', 'voga', 'vogal', 'volta', 'voltar', 'volume', 'vontade', 'votar', 'voto', 'vovô', 'vovó', 'voz', 'vulgar', 'vulto', 'xadrez', 'xale', 'xarope', 'xícara', 'zangado', 'zarpar', 'zebra', 'zelar', 'zero', 'zinco', 'zíper', 'zona', 'zunir',
];

// Função para obter palavras aleatórias
function getRandomWords(count = 50) {
  const words = [];
  const usedIndices = new Set();
  
  while (words.length < count) {
    const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
    
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      words.push(WORD_BANK[randomIndex]);
    }
  }
  
  return words;
}

// Exporta para uso no script principal
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORD_BANK, getRandomWords };
}
