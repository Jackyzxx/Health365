const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentStep = 1;
let fotoFile = null;
let isEditing = false;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndLoadData();
    setupEventListeners();
});
async function checkAuthAndLoadData() {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
        window.location.href = 'entrar.html';
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', profileError);
        return;
    }

    if (profile) {
        isEditing = true;
        document.getElementById('onboardingTitle').textContent = 'Editar Perfil';
        document.getElementById('onboardingSubtitle').textContent = 'Atualize suas informações';
        document.getElementById('submitBtn').textContent = 'Salvar Alterações';
        preencherFormulario(profile);
    }
}

function preencherFormulario(profile) {
    if (profile.nome) document.getElementById('nomeCompleto').value = profile.nome;
    if (profile.data_nascimento) document.getElementById('dataNascimento').value = profile.data_nascimento;
    if (profile.genero) document.getElementById('genero').value = profile.genero;
    if (profile.altura) document.getElementById('altura').value = profile.altura;
    if (profile.peso) document.getElementById('peso').value = profile.peso;
    if (profile.meta_sono) document.getElementById('metaSono').value = profile.meta_sono;
    if (profile.meta_alimentacao) document.getElementById('metaAlimentacao').value = profile.meta_alimentacao;
    if (profile.tipo_sanguineo) document.getElementById('tipoSanguineo').value = profile.tipo_sanguineo;
    if (profile.meta_social) document.getElementById('metaSocial').value = profile.meta_social;
    if (profile.cidade) document.getElementById('cidade').value = profile.cidade;
    if (profile.bio) document.getElementById('bio').value = profile.bio;
    if (profile.foto_url) {
        document.getElementById('photoPreview').src = profile.foto_url;
    }
}

function setupEventListeners() {
    document.getElementById('fotoInput').addEventListener('change', handlePhotoUpload);
    document.getElementById('onboardingForm').addEventListener('submit', handleFormSubmit);
}

function nextStep(step) {
    if (!validarPassoAtual(currentStep)) return;
    
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    updateProgress();
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    updateProgress();
}

function updateProgress() {
    const progress = document.getElementById('progress');
    progress.style.width = `${(currentStep / 3) * 100}%`;
}

function validarPassoAtual(passo) {
    const inputs = document.querySelectorAll(`#step${passo} input[required], #step${passo} select[required]`);
    
    for (let input of inputs) {
        if (!input.value.trim()) {
            const campo = input.previousElementSibling.textContent.replace('*', '').trim();
            if (window.notifications) {
                notifications.warning(`Por favor, preencha o campo: ${campo}`);
            } else {
                alert(`Por favor, preencha o campo: ${campo}`);
            }
            input.focus();
            return false;
        }
    }
    return true;
}

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        if (window.notifications) {
            notifications.warning('A imagem deve ter no máximo 5MB.');
        } else {
            alert('A imagem deve ter no máximo 5MB.');
        }
        return;
    }

    fotoFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('photoPreview');
        preview.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validarPassoAtual(currentStep)) return;

    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Salvando...';
    button.disabled = true;

    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !user) {
            throw new Error('Usuário não autenticado');
        }

        const userData = {
            id: user.id,
            nome: document.getElementById('nomeCompleto').value,
            data_nascimento: document.getElementById('dataNascimento').value,
            genero: document.getElementById('genero').value,
            altura: parseInt(document.getElementById('altura').value),
            peso: parseFloat(document.getElementById('peso').value),
            meta_sono: parseInt(document.getElementById('metaSono').value),
            meta_alimentacao: parseInt(document.getElementById('metaAlimentacao').value),
            tipo_sanguineo: document.getElementById('tipoSanguineo').value,
            meta_social: parseInt(document.getElementById('metaSocial').value) || 3,
            cidade: document.getElementById('cidade').value,
            bio: document.getElementById('bio').value,
            perfil_completo: true,
            atualizado_em: new Date().toISOString()
        };

        if (fotoFile) {
            const fileExt = fotoFile.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, fotoFile, { upsert: true });

            if (!uploadError) {
                const { data: urlData } = supabaseClient.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                userData.foto_url = urlData.publicUrl;
            }
        }

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .upsert(userData, { onConflict: 'id' });

        if (updateError) {
            throw updateError;
        }

        if (!isEditing) {
            await criarMetricaInicial(user.id);
        }

        if (window.notifications) {
            notifications.success(
                isEditing ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!',
                isEditing ? 'Perfil atualizado' : 'Perfil criado'
            );
        } else {
            alert(isEditing ? 'Perfil atualizado com sucesso! ✅' : 'Perfil criado com sucesso! 🎉');
        }

        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
     
        if (window.notifications) {
            notifications.error(error.message, 'Erro ao salvar perfil');
        } else {
            alert('Erro ao salvar perfil: ' + error.message);
        }
        button.textContent = originalText;
        button.disabled = false;
    }
}

async function criarMetricaInicial(userId) {
    const metricaInicial = {
        user_id: userId,
        data: new Date().toISOString().split('T')[0],
        horas_sono: 7,
        qualidade_sono: 4,
        refeicoes_saudaveis: 3,
        refeicoes_total: 4,
        atividade_fisica_minutos: 30,
        interacoes_sociais: 2
    };

    const { error } = await supabaseClient
        .from('metricas_diarias')
        .insert(metricaInicial);

    if (error) {
        console.warn('Erro ao criar métrica inicial:', error);
    }
}