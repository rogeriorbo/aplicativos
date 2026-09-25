import React from 'react';
import { ShieldCheckIcon, TargetIcon, UsersIcon, LayoutDashboardIcon, ImageIcon } from './icons';

const InfoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  index: number;
}> = ({ icon, title, children, index }) => (
  <div
    className="bg-card-background backdrop-blur-sm rounded-lg shadow-lg p-6 border border-border-color text-center flex flex-col items-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-accent/20 animate-fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="text-accent mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
    <p className="text-text-secondary flex-grow">{children}</p>
  </div>
);

export const AboutView: React.FC = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4 [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">
          Sobre o <span className="bg-gradient-to-r from-indigo-400 to-accent text-transparent bg-clip-text">Gerenciador de Links</span>
        </h1>
        <p className="max-w-3xl mx-auto text-lg text-text-secondary">
          Este sistema foi projetado para centralizar e organizar todos os seus aplicativos e recursos importantes em um único dashboard. Seja para uso pessoal, para sua equipe ou para o público, nossa plataforma oferece uma solução simples e poderosa.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-20 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="bg-card-background backdrop-blur-sm rounded-lg shadow-lg p-8 border border-border-color text-center flex flex-col items-center">
            <div className="text-accent mb-4"><TargetIcon className="w-12 h-12" /></div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">Nossa Missão</h2>
            <p className="text-text-secondary text-lg">
                Facilitar o acesso à informação e às ferramentas digitais, fornecendo uma plataforma centralizada, intuitiva e segura para que indivíduos e empresas possam organizar e compartilhar seus links essenciais com eficiência.
            </p>
        </div>
      </div>
      
      <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '400ms' }}>
        <h2 className="text-3xl font-bold text-text-primary mb-3">O Que Fazemos</h2>
        <p className="max-w-2xl mx-auto text-text-secondary">
            Oferecemos uma plataforma robusta com funcionalidades essenciais para a gestão de links.
        </p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <InfoCard title="Dashboard Centralizado" icon={<LayoutDashboardIcon className="w-12 h-12" />} index={0}>
                Visualize todos os seus links importantes em um único local, com ícones e descrições personalizadas para fácil identificação.
            </InfoCard>
             <InfoCard title="Gerenciamento de Perfis" icon={<UsersIcon className="w-12 h-12" />} index={1}>
                Crie dashboards públicos e privados. Ideal para separar links de uso pessoal, de equipe ou para visitantes.
            </InfoCard>
             <InfoCard title="Personalização Completa" icon={<ImageIcon className="w-12 h-12" />} index={2}>
                Adapte a aparência do sistema ao seu gosto. Faça upload de uma imagem de fundo personalizada e organize os links como preferir.
            </InfoCard>
             <InfoCard title="Painel Seguro" icon={<ShieldCheckIcon className="w-12 h-12" />} index={3}>
                Controle total sobre o conteúdo e os usuários através de um painel de administração robusto com diferentes níveis de permissão.
            </InfoCard>
        </div>


      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};