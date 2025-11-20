const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userProfile = null;
let historicoData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Iniciando página de histórico...');
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

        carregarHistorico();

    } catch (error) {
        console.error('💥 Erro ao carregar dados:', error);
    }
}

async function carregarHistorico() {
    if (!userProfile) return;

    const periodo = parseInt(document.getElementById('filtroPeriodo').value);
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    console.log(`📅 Carregando histórico dos últimos ${periodo} dias...`);

    try {
        const { data, error } = await supabaseClient
            .from('metricas_diarias')
            .select('*')
            .eq('user_id', userProfile.id)
            .gte('data', dataInicio.toISOString().split('T')[0])
            .order('data', { ascending: false });

        if (error) throw error;

        historicoData = data || [];
        console.log(`✅ ${historicoData.length} registros carregados`);

        atualizarInterface();

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
       
        if (window.notifications) {
            notifications.error(error.message, 'Erro ao carregar histórico');
        } else {
            alert('Erro ao carregar histórico: ' + error.message);
        }
    }
}


function atualizarInterface() {
    atualizarEstatisticas();
    atualizarTabela();
    atualizarInsights();
}
function atualizarEstatisticas() {
    if (historicoData.length === 0) {
        document.getElementById('mediaSono').textContent = '--';
        document.getElementById('mediaAlimentacao').textContent = '--';
        document.getElementById('mediaExercicio').textContent = '--';
        document.getElementById('mediaSocial').textContent = '--';
        return;
    }

    const totais = historicoData.reduce((acc, item) => {
        acc.sono += item.horas_sono || 0;
        acc.alimentacao += ((item.refeicoes_saudaveis || 0) / (item.refeicoes_total || 4)) * 100;
        acc.exercicio += item.atividade_fisica_minutos || 0;
        acc.social += item.interacoes_sociais || 0;
        return acc;
    }, { sono: 0, alimentacao: 0, exercicio: 0, social: 0 });

    const count = historicoData.length;
    const medias = {
        sono: (totais.sono / count).toFixed(1),
        alimentacao: (totais.alimentacao / count).toFixed(0),
        exercicio: Math.round(totais.exercicio / count),
        social: (totais.social / count).toFixed(1)
    };

    document.getElementById('mediaSono').textContent = `${medias.sono}h`;
    document.getElementById('mediaAlimentacao').textContent = `${medias.alimentacao}%`;
    document.getElementById('mediaExercicio').textContent = `${medias.exercicio}min`;
    document.getElementById('mediaSocial').textContent = `${medias.social}`;
}


function atualizarTabela() {
    const tbody = document.getElementById('tabelaCorpo');
    
    if (historicoData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="sem-dados">
                    📝 Nenhum registro encontrado para este período.<br>
                    <small>Comece a registrar suas métricas no Dashboard!</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = historicoData.map(item => {
        const data = new Date(item.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        
        const alimentacaoPercent = item.refeicoes_total > 0 ? 
            Math.round((item.refeicoes_saudaveis / item.refeicoes_total) * 100) : 0;

        const isDiaDestaque = (item.horas_sono >= 7 && alimentacaoPercent >= 75 && item.atividade_fisica_minutos >= 30);
        const classeDestaque = isDiaDestaque ? 'dia-destaque' : '';

        return `
            <tr class="${classeDestaque}">
                <td><strong>${dataFormatada}</strong></td>
                <td>${item.horas_sono || 0}h</td>
                <td>${alimentacaoPercent}%</td>
                <td>${item.atividade_fisica_minutos || 0}min</td>
                <td>${item.interacoes_sociais || 0}</td>
                <td>${'⭐'.repeat(item.qualidade_sono || 0)}</td>
            </tr>
        `;
    }).join('');
}


function atualizarInsights() {
    if (historicoData.length === 0) {
        document.getElementById('insightMelhoresDias').textContent = 'Registre alguns dados para ver insights.';
        document.getElementById('insightTendencias').textContent = 'Complete pelo menos 3 dias de dados.';
        document.getElementById('insightRecomendacoes').textContent = 'Use o Dashboard para registrar suas métricas.';
        return;
    }

    const melhorDia = historicoData.reduce((melhor, atual) => {
        const pontuacaoAtual = (atual.horas_sono || 0) + ((atual.refeicoes_saudaveis || 0) * 25) + ((atual.atividade_fisica_minutos || 0) / 10);
        const pontuacaoMelhor = (melhor.horas_sono || 0) + ((melhor.refeicoes_saudaveis || 0) * 25) + ((melhor.atividade_fisica_minutos || 0) / 10);
        return pontuacaoAtual > pontuacaoMelhor ? atual : melhor;
    });

    const dataMelhorDia = new Date(melhorDia.data).toLocaleDateString('pt-BR');
    document.getElementById('insightMelhoresDias').textContent = 
        `Seu melhor dia foi ${dataMelhorDia} com ${melhorDia.horas_sono}h de sono e ${melhorDia.atividade_fisica_minutos}min de exercício.`;

    const sonoUltimosDias = historicoData.slice(0, 3).reduce((acc, item) => acc + (item.horas_sono || 0), 0) / Math.min(3, historicoData.length);
    const sonoPrimeirosDias = historicoData.slice(-3).reduce((acc, item) => acc + (item.horas_sono || 0), 0) / Math.min(3, historicoData.length);
    
    const tendenciaSono = sonoUltimosDias > sonoPrimeirosDias ? 'melhorando' : 'precisa de atenção';
    document.getElementById('insightTendencias').textContent = 
        `Seu sono está ${tendenciaSono}. Mantenha o foco na qualidade do descanso.`;

    const mediaSono = historicoData.reduce((acc, item) => acc + (item.horas_sono || 0), 0) / historicoData.length;
    let recomendacao = '';
    
    if (mediaSono < 7) {
        recomendacao = 'Tente dormir pelo menos 7 horas por noite para melhor recuperação.';
    } else if (mediaSono > 9) {
        recomendacao = 'Excelente! Continue mantendo essa qualidade de sono.';
    } else {
        recomendacao = 'Bom trabalho! Seu sono está dentro da média recomendada.';
    }
    
    document.getElementById('insightRecomendacoes').textContent = recomendacao;
}


async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = 'entrar.html';
    }
}