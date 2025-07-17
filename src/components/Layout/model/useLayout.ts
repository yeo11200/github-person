import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const useLayout = () => {
  const location = useLocation();
  const currentLoction = useRef(location.pathname);

  useEffect(() => {
    if (currentLoction.current !== location.pathname) {
      currentLoction.current = location.pathname;
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
};

export default useLayout;
