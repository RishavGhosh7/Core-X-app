import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import ExpensesPage from "./pages/ExpensesPage";
import OffersPage from "./pages/OffersPage";
import ProfilePage from "./pages/ProfilePage";
import ConciergePage from "./pages/ConciergePage";
import { useNavigation } from "./hooks/useNavigation";
import { useBackendData } from "./hooks/useBackendData";

const pages = {
  home: HomePage,
  explore: ExplorePage,
  expenses: ExpensesPage,
  offers: OffersPage,
  profile: ProfilePage,
  concierge: ConciergePage
};

function App() {
  const { activeTab, navigate } = useNavigation();
  const backend = useBackendData();
  const Page = pages[activeTab];

  return (
    <Layout activeTab={activeTab} onNavigate={navigate}>
      <Page backend={backend} onNavigate={navigate} />
    </Layout>
  );
}

export default App;
