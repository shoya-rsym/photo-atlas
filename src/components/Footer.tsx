export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-[#0b111a] pb-16 md:pb-0">
      <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-2 px-4 py-8 text-center text-sm text-muted sm:flex-row sm:text-left">
        <span className="font-semibold text-foreground">&copy; Photo Atlas</span>
        <span>写真に残った旅の断片を、地図から辿る。</span>
      </div>
    </footer>
  );
}
