
console.log('🔔 Carregando sistema de notificações...');

class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Set();
        console.log('✅ Sistema de notificações inicializado');
    }

    createContainer() {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            console.log('📦 Criando container de notificações...');
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(options) {
        const {
            title = 'Notificação',
            message = '',
            type = 'info',
            duration = 4000,
            showClose = true
        } = options;

        console.log(`🔔 Mostrando notificação: ${title} - ${message}`);

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        notification.innerHTML = `
            <div class="notification-icon">
                ${icons[type] || 'i'}
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            ${showClose ? '<button class="notification-close">&times;</button>' : ''}
        `;

        this.container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide(notification);
            });
        }

        this.notifications.add(notification);
        return notification;
    }

    hide(notification) {
        if (!notification) return;

        notification.classList.remove('show');
        notification.classList.add('hide');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(notification);
        }, 300);
    }

    success(message, title = 'Sucesso!') {
        return this.show({ title, message, type: 'success' });
    }

    error(message, title = 'Erro!') {
        return this.show({ title, message, type: 'error', duration: 5000 });
    }

    warning(message, title = 'Atenção!') {
        return this.show({ title, message, type: 'warning' });
    }

    info(message, title = 'Informação') {
        return this.show({ title, message, type: 'info', duration: 3000 });
    }
}

window.notifications = new NotificationSystem();


setTimeout(() => {
    console.log('🧪 Teste automático de notificação');
    window.notifications.success('Sistema de notificações carregado!', 'Health365');
}, 500);