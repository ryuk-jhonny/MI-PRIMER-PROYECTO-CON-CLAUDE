import { useRef, useState } from 'react';
import TopNotificationBar from '../components/TopNotificationBar';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import StatsNavyBanner from '../components/StatsNavyBanner';
import ProgramsGrid from '../components/ProgramsGrid';
import CommunitySection from '../components/CommunitySection';
import CampusBanner from '../components/CampusBanner';
import InteractiveSimulator from '../components/InteractiveSimulator';
import LifeAndActivities from '../components/LifeAndActivities';
import HowQrWorks from '../components/HowQrWorks';
import Testimonials from '../components/Testimonials';
import PricingSection from '../components/PricingSection';
import FaqSection from '../components/FaqSection';
import PreFooterBanner from '../components/PreFooterBanner';
import ContactModal from '../components/ContactModal';
import Footer from '../components/Footer';
import { navigate } from '../lib/router';
import { ScrollProgressBar, useAutoReveal, useSpotlight } from '../lib/motionKit';

type SimTab = 'student-mobile' | 'teacher-portfolio' | 'director-console';
type SimView = 'qr-card' | 'attendance' | 'grades';

export default function Landing() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useSpotlight();
  useAutoReveal(mainRef, 'landing', ':scope > * > * > *');
  const [selectedPlan, setSelectedPlan] = useState('Plan Integral Campus Pro');
  const [simulatorTab, setSimulatorTab] = useState<SimTab>('student-mobile');
  const [simulatorView, setSimulatorView] = useState<SimView>('qr-card');

  const openDemoModal = (plan?: string) => {
    if (plan) setSelectedPlan(plan);
    setDemoModalOpen(true);
  };
  const openAccess = () => navigate('/app');

  const scrollToSimulator = (tab: SimTab = 'student-mobile', view: SimView = 'qr-card') => {
    setSimulatorTab(tab);
    setSimulatorView(view);
    setTimeout(() => {
      const target = tab === 'student-mobile' && view !== 'qr-card' ? document.getElementById('simulador-phone') : null;
      (target || document.getElementById('simulador'))?.scrollIntoView({ behavior: 'smooth', block: target ? 'center' : 'start' });
    }, 60);
  };

  const navigateToModule = (moduleId: string) => {
    if (moduleId === 'registro-notas') scrollToSimulator('student-mobile', 'grades');
    else if (moduleId === 'asistencia-qr') scrollToSimulator('student-mobile', 'attendance');
    else if (moduleId === 'portafolio') scrollToSimulator('teacher-portfolio');
    else scrollToSimulator('student-mobile', 'qr-card');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-orange-500 selection:text-white font-sans antialiased">
      <ScrollProgressBar />
      <TopNotificationBar onOpenDemoModal={() => openDemoModal()} onOpenAccessModal={openAccess} />
      <Navbar
        onOpenDemoModal={() => openDemoModal()}
        onScrollToSimulator={() => scrollToSimulator()}
        onNavigateToModule={navigateToModule}
        onOpenAccessModal={openAccess}
      />
      <main ref={mainRef} className="flex-1">
        <Hero onOpenDemoModal={() => openDemoModal()} onScrollToSimulator={() => scrollToSimulator()} onNavigateToModule={navigateToModule} onOpenAccessModal={openAccess} />
        <StatsNavyBanner />
        <ProgramsGrid onScrollToSimulator={() => scrollToSimulator()} onOpenDemoModal={() => openDemoModal()} onSelectModule={navigateToModule} />
        <CommunitySection />
        <CampusBanner onScrollToSimulator={() => scrollToSimulator()} />
        <InteractiveSimulator
          activeTab={simulatorTab}
          studentMobileView={simulatorView}
          onTabChange={setSimulatorTab}
          onStudentViewChange={setSimulatorView}
          onOpenDirectorConsole={() => navigate('/app')}
        />
        <LifeAndActivities onScrollToSimulator={scrollToSimulator} onOpenDemoModal={() => openDemoModal()} />
        <HowQrWorks />
        <Testimonials />
        <PricingSection onSelectPlan={(plan) => openDemoModal(plan)} />
        <FaqSection />
        <PreFooterBanner onOpenDemoModal={() => openDemoModal()} />
      </main>
      <Footer onOpenDemoModal={() => openDemoModal()} onScrollToSimulator={scrollToSimulator} onNavigateToModule={navigateToModule} />
      <ContactModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} preselectedPlan={selectedPlan} />
    </div>
  );
}
