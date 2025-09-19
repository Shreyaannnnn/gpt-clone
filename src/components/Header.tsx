"use client";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Header({
  mobileMenuOpen,
  setMobileMenuOpen,
}: HeaderProps) {
  return (
    <header className="col-start-1 md:col-start-2 col-end-3 row-start-1 row-end-2 flex items-center justify-between px-4 border-b border-white/10 sticky top-0 z-10 h-14">
      {/* Mobile Hamburger Menu */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded hover:bg-[#414141] transition-colors cursor-pointer"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      {/* Title */}
      <div className="text-sm font-medium text-white">ChatGPT</div>
      
      {/* Spacer for mobile layout */}
      <div className="md:hidden w-9"></div>
    </header>
  );
}
