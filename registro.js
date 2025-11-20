const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("formRegistro");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmar").value;

    if (senha !== confirmar) {
        if (window.notifications) {
            notifications.warning('As senhas não coincidem!');
        } else {
            alert("As senhas não coincidem!");
        }
        return;
    }

    if (senha.length < 6) {
        if (window.notifications) {
            notifications.warning('A senha deve ter pelo menos 6 caracteres!');
        } else {
            alert("A senha deve ter pelo menos 6 caracteres!");
        }
        return;
    }

    if (!nome) {
        if (window.notifications) {
            notifications.warning('Por favor, informe seu nome!');
        } else {
            alert("Por favor, informe seu nome!");
        }
        return;
    }

    const button = form.querySelector('button');
    const originalText = button.textContent;
    button.textContent = 'Criando conta...';
    button.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    nome: nome
                }
            }
        });

        if (error) {
            console.error('Erro detalhado:', error);
            throw error;
        }

        console.log('Sucesso! Data:', data);
        
        if (window.notifications) {
            notifications.success('Conta criada com sucesso! Verifique seu email para confirmar.');
        } else {
            alert("Conta criada com sucesso! Verifique seu email para confirmar.");
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error('Erro completo:', error);
        
        let mensagemErro = "Erro ao registrar: " + error.message;
        
        if (error.message.includes('User already registered')) {
            mensagemErro = "Este email já está cadastrado. Tente fazer login ou use outro email.";
        } else if (error.message.includes('Invalid email')) {
            mensagemErro = "Por favor, insira um email válido.";
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