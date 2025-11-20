const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userProfile = null;
let historicoData = [];
let charts = {};


document.addEventListener('DOMContentLoaded', function() {
    console.log('📈 Iniciando página de relatórios...');
    checkAuth();
});


async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (!user || error) {
        window.location.href = 'entrar.html';
        return;
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    loadUserData(user.id);
}

async function loadUserData(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ Erro ao carregar perfil:', error);
            return;
        }

        userProfile = profile;
        
        if (profile.foto_url) {
            document.getElementById('userAvatar').src = profile.foto_url;
        }

        carregarRelatorios();

    } catch (error) {
        console.error('💥 Erro ao carregar dados:', error);
        if (window.notifications) {
            notifications.error(error.message, 'Erro ao carregar dados');
        }
    }
}

async function carregarRelatorios() {
    if (!userProfile) return;

    const periodo = parseInt(document.getElementById('filtroPeriodo').value);
    const metrica = document.getElementById('filtroMetrica').value;
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    console.log(`📅 Carregando relatórios dos últimos ${periodo} dias...`);

    try {
        const { data, error } = await supabaseClient
            .from('metricas_diarias')
            .select('*')
            .eq('user_id', userProfile.id)
            .gte('data', dataInicio.toISOString().split('T')[0])
            .order('data', { ascending: true });

        if (error) throw error;

        historicoData = data || [];
        console.log(`✅ ${historicoData.length} registros carregados para relatórios`);

        // DEBUG: Verificar dados
        debugDados();

        atualizarResumoExecutivo();
        criarGraficos();
        atualizarAnalises();
        atualizarRecomendacoes();

    } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
        if (window.notifications) {
            notifications.error(error.message, 'Erro ao carregar relatórios');
        }
    }
}

function debugDados() {
    console.log('🔍 DEBUG - Dados carregados:', historicoData);
    
    if (historicoData.length > 0) {
        console.log('📋 Primeiro registro:', historicoData[0]);
        console.log('🎯 Campos disponíveis:', Object.keys(historicoData[0]));
        
        // Verificar valores específicos
        historicoData.forEach((item, index) => {
            console.log(`📅 ${item.data}:`, {
                sono: item.horas_sono,
                alimentacao: item.refeicoes_saudaveis + '/' + item.refeicoes_total,
                exercicio: item.atividade_fisica_minutos,
                social: item.interacoes_sociais
            });
        });
    }
}

function atualizarResumoExecutivo() {
    const periodo = document.getElementById('filtroPeriodo');
    const periodoTexto = periodo.options[periodo.selectedIndex].text;
    
    document.getElementById('periodoAnalisado').textContent = periodoTexto;
    document.getElementById('totalRegistros').textContent = `${historicoData.length} dias`;

    if (historicoData.length === 0) {
        document.getElementById('melhoresDias').textContent = 'Sem dados suficientes';
        document.getElementById('tendenciaGeral').textContent = 'Neutra';
        return;
    }

    
    const diasComPontuacao = historicoData.map(item => {
        const pontuacao = (item.horas_sono || 0) + 
                         ((item.refeicoes_saudaveis || 0) * 25) + 
                         ((item.atividade_fisica_minutos || 0) / 10) +
                         (item.interacoes_sociais || 0) * 10;
        return {
            data: new Date(item.data).toLocaleDateString('pt-BR'),
            pontuacao: pontuacao
        };
    });

    const melhorDia = diasComPontuacao.reduce((melhor, atual) => 
        atual.pontuacao > melhor.pontuacao ? atual : melhor
    );

    document.getElementById('melhoresDias').textContent = melhorDia.data;

   
    if (historicoData.length >= 3) {
        const primeiraMetade = historicoData.slice(0, Math.floor(historicoData.length / 2));
        const segundaMetade = historicoData.slice(Math.floor(historicoData.length / 2));
        
        const mediaPrimeira = calcularPontuacaoMedia(primeiraMetade);
        const mediaSegunda = calcularPontuacaoMedia(segundaMetade);
        
        const tendencia = mediaSegunda > mediaPrimeira ? 'Positiva 📈' : 
                         mediaSegunda < mediaPrimeira ? 'Precisa de atenção 📉' : 'Estável →';
        
        document.getElementById('tendenciaGeral').textContent = tendencia;
    } else {
        document.getElementById('tendenciaGeral').textContent = 'Precisa de mais dados';
    }
}

function calcularPontuacaoMedia(dados) {
    if (dados.length === 0) return 0;
    
    const total = dados.reduce((acc, item) => {
        return acc + (item.horas_sono || 0) + 
               ((item.refeicoes_saudaveis || 0) * 25) + 
               ((item.atividade_fisica_minutos || 0) / 10);
    }, 0);
    
    return total / dados.length;
}


function criarGraficos() {
    destruirGraficosExistentes();
    
    if (historicoData.length === 0) {
        criarGraficosVazios();
        return;
    }

    criarGraficoCompleto();
    criarGraficosIndividuais();
    criarGraficoComparativo();
}

function destruirGraficosExistentes() {
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
}

function criarGraficosVazios() {
    const ctx = document.getElementById('graficoCompleto').getContext('2d');
    charts.completo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Sem dados'],
            datasets: [{
                label: 'Sem dados disponíveis',
                data: [0],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: getChartOptions('Registre algumas métricas para ver os gráficos')
    });

    // Criar gráficos vazios para os individuais também
    ['Sono', 'Alimentacao', 'Exercicio', 'Social'].forEach(nome => {
        const canvas = document.getElementById(`grafico${nome}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            charts[nome.toLowerCase()] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        label: 'Sem dados',
                        data: [0],
                        borderColor: '#bdc3c7',
                        backgroundColor: 'rgba(189, 195, 199, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: getChartOptions(`Evolução do ${nome}`, true)
            });
        }
    });
}

function criarGraficoCompleto() {
    const labels = historicoData.map(item => 
        new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );

    const ctx = document.getElementById('graficoCompleto').getContext('2d');
    charts.completo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sono (horas)',
                    data: historicoData.map(item => item.horas_sono || 0),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Alimentação (%)',
                    data: historicoData.map(item => 
                        item.refeicoes_total > 0 ? 
                        Math.round((item.refeicoes_saudaveis / item.refeicoes_total) * 100) : 0
                    ),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y1'
                },
                {
                    label: 'Exercício (min)',
                    data: historicoData.map(item => item.atividade_fisica_minutos || 0),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            ...getChartOptions('Evolução de Todas as Métricas'),
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Horas/Minutos'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function criarGraficosIndividuais() {
    criarGraficoIndividual('sono', 'Sono', '🛌', 'horas', '#3498db');
    criarGraficoIndividual('alimentacao', 'Alimentação', '🥗', '%', '#2ecc71');
    criarGraficoIndividual('exercicio', 'Exercício', '💪', 'minutos', '#e74c3c');
    criarGraficoIndividual('social', 'Vida Social', '👥', 'interações', '#9b59b6');
}

function criarGraficoIndividual(tipo, nome, icone, unidade, cor) {
    const canvas = document.getElementById(`grafico${nome.charAt(0).toUpperCase() + nome.slice(1)}`);
    if (!canvas) {
        console.error(`❌ Canvas não encontrado: grafico${nome.charAt(0).toUpperCase() + nome.slice(1)}`);
        return;
    }

    const labels = historicoData.map(item => 
        new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );

    let dados = [];
    let melhor = 0;
    let media = 0;

    switch(tipo) {
        case 'sono':
            dados = historicoData.map(item => item.horas_sono || 0);
            melhor = Math.max(...dados);
            media = dados.reduce((a, b) => a + b, 0) / dados.length;
            break;
        case 'alimentacao':
            dados = historicoData.map(item => {
                if (item.refeicoes_total > 0) {
                    return Math.round((item.refeicoes_saudaveis / item.refeicoes_total) * 100);
                }
                return 0;
            });
            melhor = Math.max(...dados);
            media = dados.reduce((a, b) => a + b, 0) / dados.length;
            break;
        case 'exercicio':
            dados = historicoData.map(item => item.atividade_fisica_minutos || 0);
            melhor = Math.max(...dados);
            media = dados.reduce((a, b) => a + b, 0) / dados.length;
            break;
        case 'social':
            dados = historicoData.map(item => item.interacoes_sociais || 0);
            melhor = Math.max(...dados);
            media = dados.reduce((a, b) => a + b, 0) / dados.length;
            break;
    }

    console.log(`📊 ${nome}:`, { dados, media, melhor });

    // ATUALIZAR AS ESTATÍSTICAS
    const mediaElement = document.getElementById(`media${nome.charAt(0).toUpperCase() + nome.slice(1)}`);
    const melhorElement = document.getElementById(`melhor${nome.charAt(0).toUpperCase() + nome.slice(1)}`);
    
    if (mediaElement && melhorElement) {
        if (tipo === 'sono') {
            mediaElement.textContent = media.toFixed(1) + 'h';
            melhorElement.textContent = melhor.toFixed(1) + 'h';
        } else if (tipo === 'alimentacao') {
            mediaElement.textContent = Math.round(media) + '%';
            melhorElement.textContent = Math.round(melhor) + '%';
        } else if (tipo === 'exercicio') {
            mediaElement.textContent = Math.round(media) + 'min';
            melhorElement.textContent = Math.round(melhor) + 'min';
        } else {
            mediaElement.textContent = media.toFixed(1);
            melhorElement.textContent = melhor;
        }
    }

    // CRIAR O GRÁFICO
    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico existente se houver
    if (charts[tipo]) {
        charts[tipo].destroy();
    }

    charts[tipo] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${icone} ${nome}`,
                data: dados,
                borderColor: cor,
                backgroundColor: cor + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: getChartOptions(`Evolução do ${nome}`, true)
    });
}

function criarGraficoComparativo() {
    const ctx = document.getElementById('graficoComparativo').getContext('2d');
    
    if (historicoData.length === 0) {
        charts.comparativo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    label: 'Sem dados',
                    data: [0],
                    backgroundColor: '#bdc3c7'
                }]
            },
            options: getChartOptions('Complete alguns dias para ver comparações', true)
        });
        return;
    }
   
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dadosPorDia = {
        sono: Array(7).fill(0),
        alimentacao: Array(7).fill(0),
        exercicio: Array(7).fill(0),
        contagem: Array(7).fill(0)
    };

    historicoData.forEach(item => {
        const dia = new Date(item.data).getDay();
        dadosPorDia.sono[dia] += item.horas_sono || 0;
        dadosPorDia.alimentacao[dia] += item.refeicoes_total > 0 ? 
            (item.refeicoes_saudaveis / item.refeicoes_total) * 100 : 0;
        dadosPorDia.exercicio[dia] += item.atividade_fisica_minutos || 0;
        dadosPorDia.contagem[dia]++;
    });


    const medias = {
        sono: dadosPorDia.sono.map((total, i) => 
            dadosPorDia.contagem[i] > 0 ? total / dadosPorDia.contagem[i] : 0
        ),
        alimentacao: dadosPorDia.alimentacao.map((total, i) => 
            dadosPorDia.contagem[i] > 0 ? total / dadosPorDia.contagem[i] : 0
        ),
        exercicio: dadosPorDia.exercicio.map((total, i) => 
            dadosPorDia.contagem[i] > 0 ? total / dadosPorDia.contagem[i] : 0
        )
    };

    charts.comparativo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: diasSemana,
            datasets: [
                {
                    label: 'Sono (h)',
                    data: medias.sono,
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                },
                {
                    label: 'Alimentação (%)',
                    data: medias.alimentacao,
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 1
                },
                {
                    label: 'Exercício (min)',
                    data: medias.exercicio,
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            ...getChartOptions('Comparativo por Dia da Semana', true),
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valores'
                    }
                }
            }
        }
    });
}

function getChartOptions(title, isSmall = false) {
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: {
                    size: isSmall ? 14 : 16,
                    weight: 'bold'
                },
                padding: isSmall ? 10 : 20
            },
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: {
                        size: isSmall ? 11 : 12
                    },
                    padding: isSmall ? 10 : 15
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: isSmall ? 10 : 11
                    },
                    maxRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0,0,0,0.1)'
                },
                ticks: {
                    font: {
                        size: isSmall ? 10 : 11
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        elements: {
            point: {
                radius: isSmall ? 2 : 3,
                hoverRadius: isSmall ? 4 : 6
            }
        },
        layout: {
            padding: isSmall ? 10 : 15
        }
    };

    return baseOptions;
}


function atualizarAnalises() {
    atualizarFrequenciaRegistros();
    atualizarConsistenciaMetas();
    atualizarProgressoTempo();
    atualizarPadroesIdentificados();
}

function atualizarFrequenciaRegistros() {
    const periodo = parseInt(document.getElementById('filtroPeriodo').value);
    const percentual = historicoData.length / periodo * 100;
    
    document.getElementById('frequenciaRegistros').textContent = 
        `Você registrou dados em ${historicoData.length} de ${periodo} dias (${Math.round(percentual)}%)`;
    
    document.getElementById('progressFrequencia').style.width = `${percentual}%`;
    document.getElementById('percentualFrequencia').textContent = `${Math.round(percentual)}%`;
}

function atualizarConsistenciaMetas() {
    if (historicoData.length === 0) {
        document.getElementById('consistenciaMetas').textContent = 'Sem dados suficientes';
        document.getElementById('progressConsistencia').style.width = '0%';
        document.getElementById('percentualConsistencia').textContent = '0%';
        return;
    }

    const diasConsistentes = historicoData.filter(item => {
        const sonoOk = (item.horas_sono || 0) >= 7;
        const alimentacaoOk = item.refeicoes_total > 0 ? 
            (item.refeicoes_saudaveis / item.refeicoes_total) >= 0.75 : false;
        const exercicioOk = (item.atividade_fisica_minutos || 0) >= 30;
        
        return sonoOk && alimentacaoOk && exercicioOk;
    }).length;

    const percentual = (diasConsistentes / historicoData.length) * 100;
    
    document.getElementById('consistenciaMetas').textContent = 
        `${diasConsistentes} de ${historicoData.length} dias com todas as metas atingidas`;
    
    document.getElementById('progressConsistencia').style.width = `${percentual}%`;
    document.getElementById('percentualConsistencia').textContent = `${Math.round(percentual)}%`;
}

function atualizarProgressoTempo() {
    if (historicoData.length < 2) {
        document.getElementById('progressoTempo').textContent = 'Precisa de mais dados para análise';
        document.getElementById('indicadorProgresso').innerHTML = 
            '<span class="trend-arrow">→</span><span class="trend-text">Neutro</span>';
        return;
    }

    const primeiraMetade = historicoData.slice(0, Math.floor(historicoData.length / 2));
    const segundaMetade = historicoData.slice(Math.floor(historicoData.length / 2));
    
    const pontuacaoInicial = calcularPontuacaoMedia(primeiraMetade);
    const pontuacaoFinal = calcularPontuacaoMedia(segundaMetade);
    
    const diferenca = pontuacaoFinal - pontuacaoInicial;
    const percentualMudanca = (diferenca / pontuacaoInicial) * 100;

    let tendencia = '';
    if (Math.abs(percentualMudanca) < 5) {
        tendencia = 'Estável';
        document.getElementById('indicadorProgresso').innerHTML = 
            '<span class="trend-arrow">→</span><span class="trend-text">Estável</span>';
    } else if (percentualMudanca > 0) {
        tendencia = 'Melhorando';
        document.getElementById('indicadorProgresso').innerHTML = 
            '<span class="trend-arrow up">↗</span><span class="trend-text">Melhorando</span>';
    } else {
        tendencia = 'Precisa de atenção';
        document.getElementById('indicadorProgresso').innerHTML = 
            '<span class="trend-arrow down">↘</span><span class="trend-text">Precisa de atenção</span>';
    }

    document.getElementById('progressoTempo').textContent = 
        `Sua pontuação geral ${tendencia.toLowerCase()} (${Math.abs(percentualMudanca).toFixed(1)}% de variação)`;
}

function atualizarPadroesIdentificados() {
    const listaPadroes = document.getElementById('listaPadroes');
    listaPadroes.innerHTML = '';

    if (historicoData.length < 5) {
        document.getElementById('padroesIdentificados').textContent = 
            'Complete pelo menos 5 dias de registros para identificar padrões';
        return;
    }

    document.getElementById('padroesIdentificados').textContent = 
        `Analisando ${historicoData.length} dias de dados`;

    const padroes = identificarPadroes();
    
    padroes.forEach(padrao => {
        const item = document.createElement('div');
        item.className = 'padrao-item';
        item.innerHTML = `
            <span class="padrao-icon">•</span>
            <span>${padrao}</span>
        `;
        listaPadroes.appendChild(item);
    });

    if (padroes.length === 0) {
        listaPadroes.innerHTML = `
            <div class="padrao-item">
                <span class="padrao-icon">•</span>
                <span>Padrões consistentes não identificados. Continue registrando!</span>
            </div>
        `;
    }
}

function identificarPadroes() {
    const padroes = [];

    
    const diasFimSemana = historicoData.filter(item => {
        const dia = new Date(item.data).getDay();
        return dia === 0 || dia === 6; 
    });

    const diasSemana = historicoData.filter(item => {
        const dia = new Date(item.data).getDay();
        return dia >= 1 && dia <= 5; 
    });

    if (diasFimSemana.length > 0 && diasSemana.length > 0) {
        const mediaSonoFimSemana = diasFimSemana.reduce((acc, item) => acc + (item.horas_sono || 0), 0) / diasFimSemana.length;
        const mediaSonoSemana = diasSemana.reduce((acc, item) => acc + (item.horas_sono || 0), 0) / diasSemana.length;
        
        if (mediaSonoFimSemana - mediaSonoSemana > 1) {
            padroes.push(`Você dorme ${(mediaSonoFimSemana - mediaSonoSemana).toFixed(1)}h mais nos fins de semana`);
        }
    }

   
    const diasComExercicio = historicoData.filter(item => (item.atividade_fisica_minutos || 0) > 0).length;
    const percentualExercicio = (diasComExercicio / historicoData.length) * 100;
    
    if (percentualExercicio >= 80) {
        padroes.push('Excelente consistência nos exercícios!');
    } else if (percentualExercicio <= 30) {
        padroes.push('Oportunidade para aumentar a frequência de exercícios');
    }

    const mediaAlimentacao = historicoData.reduce((acc, item) => {
        const percentual = item.refeicoes_total > 0 ? 
            (item.refeicoes_saudaveis / item.refeicoes_total) * 100 : 0;
        return acc + percentual;
    }, 0) / historicoData.length;

    if (mediaAlimentacao >= 80) {
        padroes.push('Alimentação muito saudável! Continue assim');
    } else if (mediaAlimentacao <= 50) {
        padroes.push('Oportunidade para melhorar hábitos alimentares');
    }

    return padroes;
}

function atualizarRecomendacoes() {
    if (historicoData.length === 0) {
        document.getElementById('recomendacaoSono').textContent = 'Registre alguns dados de sono para receber recomendações';
        document.getElementById('recomendacaoAlimentacao').textContent = 'Registre refeições para receber recomendações';
        document.getElementById('recomendacaoExercicio').textContent = 'Registre exercícios para receber recomendações';
        document.getElementById('recomendacaoSocial').textContent = 'Registre interações sociais para receber recomendações';
        return;
    }

    atualizarRecomendacaoSono();
    atualizarRecomendacaoAlimentacao();
    atualizarRecomendacaoExercicio();
    atualizarRecomendacaoSocial();
}

function atualizarRecomendacaoSono() {
    const mediaSono = historicoData.reduce((acc, item) => acc + (item.horas_sono || 0), 0) / historicoData.length;
    const qualidadeMedia = historicoData.reduce((acc, item) => acc + (item.qualidade_sono || 3), 0) / historicoData.length;

    let recomendacao = '';
    
    if (mediaSono < 6) {
        recomendacao = 'Priorize dormir pelo menos 7 horas. A falta de sono afeta saúde e produtividade.';
    } else if (mediaSono < 7) {
        recomendacao = 'Bom, mas tente chegar a 7-8 horas para melhor recuperação.';
    } else if (mediaSono <= 9) {
        recomendacao = 'Excelente! Mantenha essa rotina de sono consistente.';
    } else {
        recomendacao = 'Ótima quantidade de sono! Continue com os bons hábitos.';
    }

    if (qualidadeMedia < 3) {
        recomendacao += ' Considere melhorar o ambiente do sono (escuro, silencioso e fresco).';
    }

    document.getElementById('recomendacaoSono').textContent = recomendacao;
}

function atualizarRecomendacaoAlimentacao() {
    const mediaAlimentacao = historicoData.reduce((acc, item) => {
        const percentual = item.refeicoes_total > 0 ? 
            (item.refeicoes_saudaveis / item.refeicoes_total) * 100 : 0;
        return acc + percentual;
    }, 0) / historicoData.length;

    let recomendacao = '';
    
    if (mediaAlimentacao < 50) {
        recomendacao = 'Oportunidade para incluir mais alimentos integrais, frutas e vegetais.';
    } else if (mediaAlimentacao < 75) {
        recomendacao = 'Bom progresso! Tente incluir uma refeição saudável extra por dia.';
    } else {
        recomendacao = 'Excelentes hábitos alimentares! Continue com a variedade e balanceamento.';
    }

    document.getElementById('recomendacaoAlimentacao').textContent = recomendacao;
}

function atualizarRecomendacaoExercicio() {
    const mediaExercicio = historicoData.reduce((acc, item) => acc + (item.atividade_fisica_minutos || 0), 0) / historicoData.length;
    const diasAtivos = historicoData.filter(item => (item.atividade_fisica_minutos || 0) > 0).length;
    const percentualAtivos = (diasAtivos / historicoData.length) * 100;

    let recomendacao = '';
    
    if (mediaExercicio < 20) {
        recomendacao = 'Tente incluir 10-15 minutos de caminhada diária para começar.';
    } else if (mediaExercicio < 150) {
        recomendacao = 'Bom! Procure atingir 150 minutos semanais de atividade moderada.';
    } else {
        recomendacao = 'Excelente nível de atividade! Mantenha a variedade de exercícios.';
    }

    if (percentualAtivos < 50) {
        recomendacao += ' Foque na consistência - mesmo atividades curtas diárias fazem diferença.';
    }

    document.getElementById('recomendacaoExercicio').textContent = recomendacao;
}

function atualizarRecomendacaoSocial() {
    const mediaSocial = historicoData.reduce((acc, item) => acc + (item.interacoes_sociais || 0), 0) / historicoData.length;

    let recomendacao = '';
    
    if (mediaSocial < 1) {
        recomendacao = 'Considere pequenas interações sociais diárias para bem-estar mental.';
    } else if (mediaSocial < 3) {
        recomendacao = 'Bom equilíbrio! Manter conexões sociais é importante para saúde mental.';
    } else {
        recomendacao = 'Excelente vida social! Continue cultivando essas relações importantes.';
    }

    document.getElementById('recomendacaoSocial').textContent = recomendacao;
}

function atualizarGraficos() {
    carregarRelatorios();
}


function exportarRelatorio() {
    if (historicoData.length === 0) {
        if (window.notifications) {
            notifications.warning('Não há dados para exportar', 'Exportação');
        }
        return;
    }

    const periodo = document.getElementById('filtroPeriodo').options[document.getElementById('filtroPeriodo').selectedIndex].text;
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    let conteudo = `RELATÓRIO HEALTH365\n`;
    conteudo += `Período: ${periodo}\n`;
    conteudo += `Data de geração: ${dataAtual}\n`;
    conteudo += `Total de dias analisados: ${historicoData.length}\n\n`;
    
   
    const mediaSono = historicoData.reduce((acc, item) => acc + (item.horas_sono || 0), 0) / historicoData.length;
    const mediaExercicio = historicoData.reduce((acc, item) => acc + (item.atividade_fisica_minutos || 0), 0) / historicoData.length;
    
    conteudo += `ESTATÍSTICAS:\n`;
    conteudo += `• Média de sono: ${mediaSono.toFixed(1)} horas\n`;
    conteudo += `• Média de exercício: ${Math.round(mediaExercicio)} minutos\n`;
    conteudo += `• Dias consistentes: ${calcularDiasConsistentes()} de ${historicoData.length}\n\n`;
    
    conteudo += `RECOMENDAÇÕES:\n`;
    conteudo += `• Sono: ${document.getElementById('recomendacaoSono').textContent}\n`;
    conteudo += `• Alimentação: ${document.getElementById('recomendacaoAlimentacao').textContent}\n`;
    conteudo += `• Exercício: ${document.getElementById('recomendacaoExercicio').textContent}\n`;

    
    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-health365-${dataAtual.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.notifications) {
        notifications.success('Relatório exportado com sucesso!', 'Exportação');
    }
}

function calcularDiasConsistentes() {
    return historicoData.filter(item => {
        const sonoOk = (item.horas_sono || 0) >= 7;
        const alimentacaoOk = item.refeicoes_total > 0 ? 
            (item.refeicoes_saudaveis / item.refeicoes_total) >= 0.75 : false;
        const exercicioOk = (item.atividade_fisica_minutos || 0) >= 30;
        
        return sonoOk && alimentacaoOk && exercicioOk;
    }).length;
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = 'entrar.html';
    }
}