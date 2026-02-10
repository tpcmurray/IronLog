import { useState, useEffect } from 'react';
import { subscribeOnline, isOffline } from '../../api/client';

export default function ConnectionBanner() {
  const [offline, setOffline] = useState(isOffline);

  useEffect(() => subscribeOnline(setOffline), []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#92400e] text-white text-center text-sm font-medium py-2 z-[90]">
      Connection lost — check your network
    </div>
  );
}
