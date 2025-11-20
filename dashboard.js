const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userProfile = null;
let currentMetric = '';
let metricasHoje = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando dashboard...');
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const metric = this.getAttribute('data-metric');
            console.log('📝 Botão clicado:', metric);
            openMetricModal(metric);
        });
    });

    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });

    console.log('✅ Event listeners configurados');
}

function handleQuickAction(action) {
    console.log('⚡ Ação rápida:', action);
    switch(action) {
        case 'perfil':
            window.location.href = 'perfil.html';
            break;
        case 'historico':
            window.location.href = 'historico.html';
            break;
        case 'sono':
            openMetricModal('sono');
            break;
        case 'alimentacao':
            openMetricModal('alimentacao');
            break;
        case 'exercicio':
            openMetricModal('exercicio');
            break;
        case 'social':
            openMetricModal('social');
            break;
    }
}

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
        console.log('📥 Carregando dados do usuário...');
        
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
        console.log('✅ Perfil carregado:', profile.nome);

        updateUserInfo(userProfile);
        await loadMetricasHoje(userId);

    } catch (error) {
        console.error('💥 Erro ao carregar dados:', error);
    }
}


function updateUserInfo(profile) {
    if (profile.foto_url) {
        document.getElementById('userAvatar').src = profile.foto_url;
    }
    
    document.getElementById('userName').textContent = profile.nome || 'Usuário';
    
    const welcomeMessage = profile.nome ? 
        `Olá, ${profile.nome}! 👋` : 
        'Bem-vindo de volta! 👋';
    document.getElementById('welcomeMessage').textContent = welcomeMessage;
}

async function loadMetricasHoje(userId) {
    const hoje = new Date().toISOString().split('T')[0];
    console.log('📅 Buscando métricas para:', hoje);
    
    const { data, error } = await supabaseClient
        .from('metricas_diarias')
        .select('*')
        .eq('user_id', userId)
        .eq('data', hoje)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.log('ℹ️ Nenhuma métrica encontrada para hoje');
            metricasHoje = {
                horas_sono: 7,
                qualidade_sono: 4,
                refeicoes_saudaveis: 3,
                refeicoes_total: 4,
                atividade_fisica_minutos: 30,
                interacoes_sociais: 2
            };
        } else {
            console.error('❌ Erro ao carregar métricas:', error);
            return;
        }
    } else {
        metricasHoje = data;
        console.log('✅ Métricas de hoje:', metricasHoje);
    }

    updateDashboard();
    updateWeeklySummary();
}


function updateDashboard() {
    console.log('🎨 Atualizando dashboard...');
    
    if (!metricasHoje || !userProfile) {
        console.log('⚠️ Dados insuficientes para atualizar dashboard');
        return;
    }

   
    const sleepHours = metricasHoje.horas_sono || 0;
    const sleepGoal = userProfile.meta_sono || 8;
    const sleepPercent = Math.min((sleepHours / sleepGoal) * 100, 100);
    
    document.getElementById('sleepMetric').textContent = `${sleepHours}h`;
    document.getElementById('sleepProgress').style.width = `${sleepPercent}%`;
    document.getElementById('sleepText').textContent = `${Math.round(sleepPercent)}% da meta`;

  
    const healthyMeals = metricasHoje.refeicoes_saudaveis || 0;
    const totalMeals = metricasHoje.refeicoes_total || 4;
    const foodPercent = totalMeals > 0 ? (healthyMeals / totalMeals) * 100 : 0;
    
    document.getElementById('foodMetric').textContent = `${Math.round(foodPercent)}%`;
    document.getElementById('foodProgress').style.width = `${foodPercent}%`;
    document.getElementById('foodText').textContent = `${healthyMeals}/${totalMeals} refeições`;

 
    const exerciseMinutes = metricasHoje.atividade_fisica_minutos || 0;
    const exerciseGoal = 60;
    const exercisePercent = Math.min((exerciseMinutes / exerciseGoal) * 100, 100);
    
    document.getElementById('exerciseMetric').textContent = `${exerciseMinutes}min`;
    document.getElementById('exerciseProgress').style.width = `${exercisePercent}%`;
    document.getElementById('exerciseText').textContent = `${Math.round(exercisePercent)}% da meta`;

    const socialCount = metricasHoje.interacoes_sociais || 0;
    const socialGoal = userProfile.meta_social || 3;
    const socialPercent = Math.min((socialCount / socialGoal) * 100, 100);
    
    document.getElementById('socialMetric').textContent = `${socialCount}/${socialGoal}`;
    document.getElementById('socialProgress').style.width = `${socialPercent}%`;
    document.getElementById('socialText').textContent = `${socialCount} encontros esta semana`;

    updateDate();
}


async function updateWeeklySummary() {
    if (!userProfile) return;

    try {
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

        const { data: metricasSemana, error } = await supabaseClient
            .from('metricas_diarias')
            .select('*')
            .eq('user_id', userProfile.id)
            .gte('data', umaSemanaAtras.toISOString().split('T')[0])
            .order('data', { ascending: true });

        if (error) throw error;

        if (metricasSemana && metricasSemana.length > 0) {
            calcularResumoSemanal(metricasSemana);
        } else {
            document.getElementById('weeklySleep').textContent = '7.2h';
            document.getElementById('weeklyFood').textContent = '75%';
            document.getElementById('weeklyExercise').textContent = '35min';
            document.getElementById('weeklySocial').textContent = '60%';
        }
    } catch (error) {
        console.error('Erro ao carregar resumo semanal:', error);
    }
}


function calcularResumoSemanal(metricas) {
    const totais = metricas.reduce((acc, metrica) => {
        acc.sono += metrica.horas_sono || 0;
        acc.alimentacao += ((metrica.refeicoes_saudaveis || 0) / (metrica.refeicoes_total || 4)) * 100;
        acc.exercicio += metrica.atividade_fisica_minutos || 0;
        acc.social += metrica.interacoes_sociais || 0;
        return acc;
    }, { sono: 0, alimentacao: 0, exercicio: 0, social: 0 });

    const count = metricas.length;
    const media = {
        sono: (totais.sono / count).toFixed(1),
        alimentacao: (totais.alimentacao / count).toFixed(0),
        exercicio: Math.round(totais.exercicio / count),
        social: (totais.social / count).toFixed(0)
    };

    document.getElementById('weeklySleep').textContent = `${media.sono}h`;
    document.getElementById('weeklyFood').textContent = `${media.alimentacao}%`;
    document.getElementById('weeklyExercise').textContent = `${media.exercicio}min`;
    document.getElementById('weeklySocial').textContent = `${media.social}%`;
}


function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('pt-BR', options);
}


function openMetricModal(metric) {
    console.log('📝 Abrindo modal para:', metric);
    currentMetric = metric;
    const modal = document.getElementById('metricModal');
    
    let valorPadrao = 0;
    let titulo = '';
    let label = '';
    let unidade = '';
    let mostrarQualidade = false;

    switch(metric) {
        case 'sono':
            valorPadrao = metricasHoje?.horas_sono || 7;
            titulo = 'Registrar Horas de Sono';
            label = 'Horas dormidas:';
            unidade = 'horas';
            mostrarQualidade = true;
            break;
        case 'alimentacao':
            valorPadrao = metricasHoje?.refeicoes_saudaveis || 3;
            titulo = 'Registrar Alimentação';
            label = 'Refeições saudáveis:';
            unidade = 'de 4 refeições';
            mostrarQualidade = false;
            break;
        case 'exercicio':
            valorPadrao = metricasHoje?.atividade_fisica_minutos || 30;
            titulo = 'Registrar Exercício';
            label = 'Minutos de atividade:';
            unidade = 'minutos';
            mostrarQualidade = false;
            break;
        case 'social':
            valorPadrao = metricasHoje?.interacoes_sociais || 2;
            titulo = 'Registrar Vida Social';
            label = 'Interações sociais:';
            unidade = 'encontros';
            mostrarQualidade = false;
            break;
    }
    
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('metricLabel').textContent = label;
    document.getElementById('metricValue').value = valorPadrao;
    document.getElementById('metricUnit').textContent = unidade;
    document.getElementById('qualityGroup').style.display = mostrarQualidade ? 'block' : 'none';
    
    if (mostrarQualidade) {
        document.getElementById('metricQuality').value = metricasHoje?.qualidade_sono || 4;
    }
    
    modal.style.display = 'block';
    console.log('✅ Modal aberto para:', metric);
}

function closeModal() {
    document.getElementById('metricModal').style.display = 'none';
}


document.getElementById('metricForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const valor = parseFloat(document.getElementById('metricValue').value);
    const qualidade = parseInt(document.getElementById('metricQuality').value) || 4;
    
    if (!userProfile || !currentMetric) {
        if (window.notifications) {
            notifications.error('Usuário não carregado');
        } else {
            alert('❌ Erro: usuário não carregado');
        }
        return;
    }
    
    console.log('💾 Salvando métrica:', currentMetric, valor);
    
    const hoje = new Date().toISOString().split('T')[0];
    
    const dadosMetrica = {
        user_id: userProfile.id,
        data: hoje
    };
    
    switch(currentMetric) {
        case 'sono':
            dadosMetrica.horas_sono = valor;
            dadosMetrica.qualidade_sono = qualidade;
            break;
        case 'alimentacao':
            dadosMetrica.refeicoes_saudaveis = valor;
            dadosMetrica.refeicoes_total = 4;
            break;
        case 'exercicio':
            dadosMetrica.atividade_fisica_minutos = valor;
            break;
        case 'social':
            dadosMetrica.interacoes_sociais = valor;
            break;
    }
    
    try {
        console.log('📤 Enviando para o banco:', dadosMetrica);

        const { data: existing, error: checkError } = await supabaseClient
            .from('metricas_diarias')
            .select('id')
            .eq('user_id', userProfile.id)
            .eq('data', hoje)
            .single();

        let result;
        if (existing) {
            console.log('🔄 Atualizando registro existente');
            result = await supabaseClient
                .from('metricas_diarias')
                .update(dadosMetrica)
                .eq('id', existing.id);
        } else {
            console.log('🆕 Criando novo registro');
            result = await supabaseClient
                .from('metricas_diarias')
                .insert(dadosMetrica);
        }

        if (result.error) throw result.error;
        
        console.log('✅ Métrica salva com sucesso:', result.data);
        
        metricasHoje = { ...metricasHoje, ...dadosMetrica };
        
        updateDashboard();
        closeModal();
        
       
        if (window.notifications) {
            notifications.success('Métrica atualizada com sucesso!');
        } else {
            alert('✅ Métrica atualizada com sucesso!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar métrica:', error);
       
        if (window.notifications) {
            notifications.error(error.message);
        } else {
            alert('❌ Erro: ' + error.message);
        }
    }
});


async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = 'entrar.html';
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('metricModal');
    if (event.target === modal) {
        closeModal();
    }
}


document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});