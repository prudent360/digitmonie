type IconProps = React.SVGProps<SVGSVGElement>;

function icon(paths: React.ReactNode) {
  return function Icon({ className = "size-5", ...props }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>);
export const WalletIcon = icon(<><path d="M3 7a2 2 0 0 1 2-2h13v4" /><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z" /><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" /></>);
export const TrendUpIcon = icon(<><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>);
export const LandmarkIcon = icon(<><path d="M3 21h18" /><path d="M5 21V10M9.5 21V10M14.5 21V10M19 21V10" /><path d="M2 10 12 3l10 7Z" /></>);
export const PiggyIcon = icon(<><path d="M19 9.5c1 .4 2 1.4 2 2.5h-1.5c-.6 2-2 3.3-3.5 4V19h-3v-2h-3v2H7v-3.2A6.5 6.5 0 0 1 4 10.5C4 7 7.2 5 11 5c2.6 0 4.6.8 6 2l2-1v3.5Z" /><circle cx="15.5" cy="10" r=".8" fill="currentColor" stroke="none" /></>);
export const ReceiptIcon = icon(<><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>);
export const SettingsIcon = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>);
export const BellIcon = icon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const UsersIcon = icon(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>);
export const IdCardIcon = icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.5-1.5 1.6-2 3-2s2.5.5 3 2M14 10h4M14 13h3" /></>);
export const ChartIcon = icon(<><path d="M3 3v18h18" /><path d="M7 15v2M11 11v6M15 7v10M19 12v5" /></>);
export const LogoutIcon = icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>);
export const MenuIcon = icon(<><path d="M4 6h16M4 12h16M4 18h16" /></>);
export const XIcon = icon(<><path d="M18 6 6 18M6 6l12 12" /></>);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = icon(<path d="m9 6 6 6-6 6" />);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const EyeIcon = icon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOffIcon = icon(<><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" /></>);
export const LockIcon = icon(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></>);
export const ShieldIcon = icon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>);
export const ZapIcon = icon(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />);
export const PhoneIcon = icon(<><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>);
export const BriefcaseIcon = icon(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>);
export const ClockIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const DownloadIcon = icon(<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>);
export const StarIcon = icon(<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" fill="currentColor" stroke="none" />);
export const CardIcon = icon(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>);
export const SendIcon = icon(<><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>);
export const ReceiveIcon = icon(<><path d="M17 7 7 17" /><path d="M16 17H7V8" /></>);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const BoltIcon = icon(<><path d="M4 14 14 3l-2 8h8L10 21l2-7Z" /></>);
export const CopyIcon = icon(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>);
export const FilterIcon = icon(<path d="M3 5h18l-7 8v6l-4 2v-8Z" />);
export const GiftIcon = icon(<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5" /></>);
export const AlertIcon = icon(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>);
export const UserCogIcon = icon(<><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4" /><circle cx="18" cy="17" r="2.5" /><path d="M18 13v1.5M18 19.5V21M14 17h1.5M20.5 17H22" /></>);
export const GlobeIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>);
export const ArrowRightIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const FingerprintIcon = icon(<><path d="M12 11v3a8 8 0 0 1-1.5 4.7" /><path d="M8.5 8.5A4 4 0 0 1 16 11v1.5M16 16a14 14 0 0 1-.6 3.5M5 15c.5-1.3.7-2.6.7-4a6.3 6.3 0 0 1 9.7-5.3M18.6 9A6.3 6.3 0 0 1 19 11v1" /><path d="M8 11v1a10 10 0 0 1-1.6 5.6" /></>);
export const SparkIcon = icon(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />);

export const AppleIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.5 1-1.4 1.3-2.7 1.4-2.8-.1 0-2.6-1-2.6-4.1ZM13.9 5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" /></svg>
);
export const PlayStoreIcon = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path fill="#34a853" d="M3.6 2.2 13.8 12 3.6 21.8a1.5 1.5 0 0 1-.6-1.2V3.4c0-.5.2-.9.6-1.2Z" /><path fill="#fbbc04" d="m17.2 8.6-3.4 3.4 3.4 3.4 3.9-2.2c1.1-.6 1.1-1.8 0-2.4Z" /><path fill="#4285f4" d="M13.8 12 3.6 21.8c.4.3 1 .3 1.6 0l12-6.4Z" /><path fill="#ea4335" d="M13.8 12 17.2 8.6l-12-6.4c-.6-.3-1.2-.3-1.6 0Z" /></svg>
);
