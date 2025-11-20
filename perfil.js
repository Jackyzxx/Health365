
const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);



async function carregarPerfil() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        window.location.href = 'entrar.html';
        return;
    }

    try {
        const { data: perfil, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Erro ao carregar perfil:', error);
            mostrarMensagemErro();
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];
        const { data: metricaHoje } = await supabaseClient
            .from('metricas_diarias')
            .select('*')
            .eq('user_id', user.id)
            .eq('data', hoje)
            .single();

        processarDadosPerfil(perfil, user.email, metricaHoje);

    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagemErro();
    }
}

function processarDadosPerfil(perfil, email, metricaHoje) {
    const idade = perfil.data_nascimento ? 
        Math.floor((new Date() - new Date(perfil.data_nascimento)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;

    const imc = perfil.altura && perfil.peso ? 
        (perfil.peso / ((perfil.altura / 100) ** 2)).toFixed(1) : 
        null;

    const dataNascimentoFormatada = perfil.data_nascimento ? 
        new Date(perfil.data_nascimento).toLocaleDateString('pt-BR') : 
        'Não informada';

    atualizarInterface(perfil, idade, imc, email, dataNascimentoFormatada, metricaHoje);
}

function atualizarInterface(perfil, idade, imc, email, dataNascimento, metricaHoje) {
    document.getElementById('nomeUsuario').textContent = perfil.nome || 'Usuário';
    document.getElementById('emailUsuario').textContent = email;
    document.getElementById('bioUsuario').textContent = perfil.bio || 'Adicione uma biografia para personalizar seu perfil.';

    const fotoPerfil = document.getElementById('fotoPerfil');
    if (perfil.foto_url) {
        console.log('📸 Carregando foto do perfil:', perfil.foto_url);
        fotoPerfil.src = perfil.foto_url;
        fotoPerfil.onerror = function() {
            console.error('❌ Erro ao carregar foto, usando placeholder');
            this.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face';
        };
    } else {
        console.log('📸 Usando foto placeholder');
        fotoPerfil.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face';
    }

    document.getElementById('idadeStat').textContent = idade ? idade + ' anos' : '--';
    document.getElementById('alturaStat').textContent = perfil.altura ? perfil.altura + ' cm' : '--';
    document.getElementById('pesoStat').textContent = perfil.peso ? perfil.peso + ' kg' : '--';

    const horasSono = metricaHoje?.horas_sono || 7;
    const refeicoesSaudaveis = metricaHoje?.refeicoes_saudaveis || 3;
    const atividadeFisica = metricaHoje?.atividade_fisica_minutos || 30;
    const interacoesSociais = metricaHoje?.interacoes_sociais || 2;

    document.getElementById('metaSono').textContent = perfil.meta_sono ? perfil.meta_sono + 'h / noite' : '8h / noite';
    document.getElementById('metaAlimentacao').textContent = perfil.meta_alimentacao ? perfil.meta_alimentacao + '% saudável' : '90% saudável';
    document.getElementById('imcValor').textContent = imc ? imc : '--';
    document.getElementById('tipoSanguineo').textContent = perfil.tipo_sanguineo ? formatarTipoSanguineo(perfil.tipo_sanguineo) : '--';

    document.getElementById('infoNome').textContent = perfil.nome || 'Não informado';
    document.getElementById('infoNascimento').textContent = dataNascimento;
    document.getElementById('infoGenero').textContent = formatarGenero(perfil.genero);
    document.getElementById('infoCidade').textContent = perfil.cidade || 'Não informada';
    document.getElementById('infoSono').textContent = perfil.meta_sono ? perfil.meta_sono + 'h / noite' : '8h / noite';
    document.getElementById('infoAlimentacao').textContent = perfil.meta_alimentacao ? perfil.meta_alimentacao + '%' : '90%';
    document.getElementById('infoSocial').textContent = perfil.meta_social ? perfil.meta_social + ' encontros/semana' : '3 encontros/semana';
    document.getElementById('infoCompleto').textContent = perfil.perfil_completo ? '✅ Sim' : '❌ Não';

    document.getElementById('sonoHoje').textContent = horasSono + 'h';
    document.getElementById('alimentacaoHoje').textContent = refeicoesSaudaveis + '/4 refeições';
    document.getElementById('exercicioHoje').textContent = atividadeFisica + 'min';
    document.getElementById('socialHoje').textContent = interacoesSociais + ' encontros';
}

function formatarGenero(genero) {
    const generos = {
        'masculino': 'Masculino',
        'feminino': 'Feminino',
        'outro': 'Outro',
        'prefiro_nao_dizer': 'Prefiro não dizer'
    };
    return generos[genero] || 'Não informado';
}

function formatarTipoSanguineo(tipo) {
    const tipos = {
        'a_plus': 'A+',
        'a_minus': 'A-',
        'b_plus': 'B+',
        'b_minus': 'B-',
        'ab_plus': 'AB+',
        'ab_minus': 'AB-',
        'o_plus': 'O+',
        'o_minus': 'O-'
    };
    return tipos[tipo] || tipo || '--';
}

function mostrarMensagemErro() {
    document.getElementById('nomeUsuario').textContent = 'Erro ao carregar';
    document.getElementById('emailUsuario').textContent = 'Tente recarregar a página';
}

async function uploadFoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        if (window.notifications) {
            notifications.warning('A imagem deve ter no máximo 5MB.', 'Avatar');
        }
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const fotoPerfil = document.getElementById('fotoPerfil');
    const originalSrc = fotoPerfil.src;

    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            fotoPerfil.src = e.target.result;
        };
        reader.readAsDataURL(file);

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        console.log('📤 Fazendo upload da foto...');

        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, { 
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            throw uploadError;
        }

        const { data: urlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);

        console.log('✅ Upload concluído, URL:', urlData.publicUrl);

       
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ 
                foto_url: urlData.publicUrl,
                atualizado_em: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Erro ao atualizar perfil:', updateError);
            throw updateError;
        }

        fotoPerfil.src = urlData.publicUrl + '?t=' + new Date().getTime();
        
        if (window.notifications) {
            notifications.success('Foto de perfil atualizada com sucesso!', 'Foto alterada');
        } else {
            alert('Foto atualizada com sucesso! ✅');
        }

    } catch (error) {
        console.error('💥 Erro ao fazer upload:', error);
     
        fotoPerfil.src = originalSrc;
        
     
        if (window.notifications) {
            notifications.error(error.message, 'Erro ao alterar foto');
        } else {
            alert('Erro ao alterar foto: ' + error.message);
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 Inicializando página de perfil...');
    carregarPerfil();
    
    const inputFoto = document.createElement('input');
    inputFoto.type = 'file';
    inputFoto.accept = 'image/*';
    inputFoto.style.display = 'none';
    inputFoto.addEventListener('change', uploadFoto);
    document.body.appendChild(inputFoto);

    const trocarFotoBtn = document.querySelector('.trocar-foto');
    const fotoContainer = document.querySelector('.foto-container');
    
    if (trocarFotoBtn) {
        trocarFotoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            inputFoto.click();
        });
    }

    if (fotoContainer) {
        fotoContainer.addEventListener('click', (e) => {
            e.preventDefault();
            inputFoto.click();
        });
        fotoContainer.style.cursor = 'pointer';
    }

    const btnEditar = document.querySelector('.btn-editar');
    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            window.location.href = 'onboarding.html';
        });
    }

    const btnRelatorios = document.querySelector('.btn-relatorios');
    if (btnRelatorios) {
        btnRelatorios.addEventListener('click', () => {
            window.location.href = 'relatorios.html';
        });
    }

    console.log('✅ Página de perfil inicializada');
});
async function debugFoto() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) return;

    const { data: perfil, error } = await supabaseClient
        .from('profiles')
        .select('foto_url, nome')
        .eq('id', user.id)
        .single();

    console.log('🔍 DEBUG FOTO:');
    console.log('Usuário:', user.id);
    console.log('Perfil:', perfil);
    console.log('Foto URL no banco:', perfil?.foto_url);
    console.log('Tipo da foto_url:', typeof perfil?.foto_url);
    
    if (perfil?.foto_url) {
        console.log('📸 Testando carregamento da imagem...');
        const img = new Image();
        img.onload = function() {
            console.log('✅ Imagem carrega normalmente');
        };
        img.onerror = function() {
            console.log('❌ Erro ao carregar imagem');
        };
        img.src = perfil.foto_url;
    }
}
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 Inicializando página de perfil...');
    carregarPerfil();
    debugFoto(); 
   
});