const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("formEntrar");


async function checkExistingSession() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('perfil_completo')
            .eq('id', user.id)
            .single();

        if (profile && profile.perfil_completo) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'onboarding.html';
        }
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("emailLogin").value;
    const senha = document.getElementById("senhaLogin").value;

    if (!email || !senha) {
        if (window.notifications) {
            notifications.warning('Por favor, preencha todos os campos.');
        } else {
            alert("Por favor, preencha todos os campos.");
        }
        return;
    }

    const button = form.querySelector('button');
    const originalText = button.textContent;
    button.textContent = 'Entrando...';
    button.disabled = true;

    try {
        console.log('🔐 Tentando login...');

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }

        console.log('✅ Login bem-sucedido!', data.user.email);

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('perfil_completo, nome')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.warn('⚠️ Erro ao buscar perfil:', profileError);
            window.location.href = 'onboarding.html';
            return;
        }

        const nomeUsuario = profile?.nome || data.user.email;
        
        if (profile?.perfil_completo) {
        
            if (window.notifications) {
                notifications.success(`Bem-vindo de volta, ${nomeUsuario}!`);
            } else {
                alert(`🎉 Bem-vindo de volta, ${nomeUsuario}!`);
            }
            window.location.href = "dashboard.html";
        } else {
           
            if (window.notifications) {
                notifications.info(`Olá, ${nomeUsuario}! Vamos completar seu perfil.`);
            } else {
                alert(`👋 Olá, ${nomeUsuario}! Vamos completar seu perfil.`);
            }
            window.location.href = "onboarding.html";
        }

    } catch (error) {
        console.error('💥 Erro completo:', error);
        
        let mensagemErro = "Erro ao entrar: " + error.message;
        
        if (error.message.includes('Invalid login credentials')) {
            mensagemErro = "Email ou senha incorretos. Tente novamente.";
        } else if (error.message.includes('Email not confirmed')) {
            mensagemErro = "Email não confirmado. Verifique sua caixa de entrada.";
        } else if (error.message.includes('User not found')) {
            mensagemErro = "Usuário não encontrado. Verifique o email ou crie uma conta.";
        }
   
        if (window.notifications) {
            notifications.error(mensagemErro);
        } else {
            alert(mensagemErro);
        }
        
        button.textContent = originalText;
        button.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    checkExistingSession();
    
    document.getElementById('senhaLogin').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });
});