import DashboardPreview from '../components/home/DashboardPreview'
import FeatureSection from '../components/home/FeatureSection'
import HeroSection from '../components/home/HeroSection'
import HomeFooter from '../components/home/HomeFooter'
import HomeHeader from '../components/home/HomeHeader'

export default function HomePage() {
  return <main className="landing home"><HomeHeader /><HeroSection /><FeatureSection /><DashboardPreview /><HomeFooter /></main>
}
