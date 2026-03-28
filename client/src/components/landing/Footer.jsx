const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#' },
      { label: 'Self-Host', href: '#self-host' },
      { label: 'GitHub', href: '#' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Website', href: 'https://aiwalaaditya.com/' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/adityaabhatt/' },
      { label: 'Instagram', href: 'https://www.instagram.com/your_data_scientist/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#140F0A] border-t border-white/5">
      <div className="container-max py-16 px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {/* Logo column */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-serif text-xl text-white">SurveyAgent</span>
            <p className="text-white/40 text-sm font-sans mt-3 leading-relaxed">
              Open-source AI survey platform for qualitative insights.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-sans text-sm font-medium text-white/80 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors font-sans"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30 font-sans">
            &copy; {new Date().getFullYear()} SurveyAgent. MIT License.
          </p>
        </div>
      </div>
    </footer>
  );
}
