// Em: src/components/Footer.jsx

export function Footer() {
    return (
      <footer className="bg-white border-t border-slate-200">
        <div className="container mx-auto text-center py-8 px-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Ticketfy Technologies Inc. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }