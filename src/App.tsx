import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Provider, useApp } from './context';
import { Empty, Footer, Header, Loading } from './components';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Auth } from './pages/Auth';
import { History } from './pages/History';
import { Result } from './pages/Result';
import { Profile } from './pages/Profile';
import { Info } from './pages/Info';
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useApp();
  const location = useLocation();
  if (loading) return <Loading />;
  return user ? (
    children
  ) : (
    <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  );
}
export function App() {
  return (
    <Provider>
      <a className="skip-link" href="#main">
        Мазмұнға өту
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/forgot-password" element={<Auth mode="forgot" />} />
          <Route path="/reset-password" element={<Auth mode="reset" />} />
          <Route
            path="/history"
            element={
              <Protected>
                <History />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route
            path="/result/:id"
            element={
              <Protected>
                <Result />
              </Protected>
            }
          />
          <Route path="/about" element={<Info type="about" />} />
          <Route path="/faq" element={<Info type="faq" />} />
          <Route path="/privacy" element={<Info type="privacy" />} />
          <Route path="/terms" element={<Info type="terms" />} />
          <Route
            path="*"
            element={
              <div className="container page-container">
                <Empty
                  title="Бұл бет табылмады"
                  text="Сілтемені тексеріңіз немесе басты бетке оралыңыз."
                  action={
                    <Link className="button gold" to="/">
                      Басты бетке
                    </Link>
                  }
                />
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </Provider>
  );
}
