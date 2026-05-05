import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import ExpensesPage from "./pages/ExpensesPage";
import OffersPage from "./pages/OffersPage";
import ProfilePage from "./pages/ProfilePage";
import { useNavigation } from "./hooks/useNavigation";
import { useBackendData } from "./hooks/useBackendData";

const pages = {
  home: HomePage,
  explore: ExplorePage,
  expenses: ExpensesPage,
  offers: OffersPage,
  profile: ProfilePage
};

function App() {
  const { activeTab, navigate } = useNavigation();
  const backend = useBackendData();
  const Page = pages[activeTab];

  return (
    <Layout activeTab={activeTab} onNavigate={navigate}>
      <Page backend={backend} />
    </Layout>
  );
}

export default App;
