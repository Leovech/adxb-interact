"use client";

import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";
import LogoMark from "./LogoMark";

export default function ContactSection() {
  const t = useT();

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card-bg to-accent/5" id="contact">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {/* Left: Info */}
        <div className="p-6 lg:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 overflow-hidden">
              <LogoMark className="h-11 w-11 text-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t("brand_name")}
              </h2>
              <p className="text-xs text-accent font-medium">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-3">
            {t("contact_title")}
          </h3>
          <p className="text-sm text-muted leading-relaxed mb-6">
            {t("contact_subtitle")}
          </p>

          <div className="space-y-3">
            <a
              href="mailto:info@sandsquaregroup.com"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/10 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("contact_email")}</p>
                <p className="text-sm font-medium text-foreground">info@sandsquaregroup.com</p>
              </div>
            </a>

            <a
              href="tel:+971585733939"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/10 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20">
                <Phone className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("contact_phone")}</p>
                <p className="text-sm font-medium text-foreground">+971 58 573 3939</p>
              </div>
            </a>

            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("location")}</p>
                <p className="text-sm font-medium text-foreground">{t("contact_location")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: CTA */}
        <div className="border-t border-accent/20 p-6 lg:border-l lg:border-t-0 lg:p-8 flex flex-col justify-center">
          <div className="rounded-xl border border-card-border bg-card-bg p-6">
            <h3 className="text-base font-bold text-foreground mb-2">
              {t("consultation_title")}
            </h3>
            <p className="text-sm text-muted mb-5 leading-relaxed">
              {t("consultation_desc")}
            </p>
            <a
              href="mailto:info@sandsquaregroup.com?subject=ADXBInteract%20-%20Consultation%20Request"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover shadow-lg shadow-accent/20"
            >
              {t("send_inquiry")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-card-border" />
            <span className="text-xs text-muted">{t("contact_cta")}</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <a
              href="https://wa.me/971585733939"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border transition-colors hover:border-accent hover:bg-accent/10"
              title="WhatsApp"
            >
              <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a
              href="mailto:info@sandsquaregroup.com"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border transition-colors hover:border-accent hover:bg-accent/10"
              title="Email"
            >
              <Mail className="h-5 w-5 text-accent" />
            </a>
            <a
              href="tel:+971585733939"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border transition-colors hover:border-accent hover:bg-accent/10"
              title="Phone"
            >
              <Phone className="h-5 w-5 text-accent" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
