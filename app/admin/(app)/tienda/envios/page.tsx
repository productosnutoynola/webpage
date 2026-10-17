import { listZones, type AdminZone } from "@/lib/admin-store";
import { LoadError, Page, PageHeader } from "@/components/admin/ui";
import { NewZone, ZoneRow } from "@/components/admin/zone-editor";

export const dynamic = "force-dynamic";

export default async function Envios() {
  let zones: AdminZone[];
  try {
    zones = await listZones();
  } catch (e) {
    return <Page><LoadError error={e} /></Page>;
  }
  return (
    <Page>
      <PageHeader
        eyebrow="Configuración de la tienda"
        title="Envíos por ciudad"
        intro={<>Cada ciudad con tarifa propia usa su valor; las demás usan <strong>Resto del país</strong>. Pon el valor en $0 para envío gratis siempre. El checkout y el cobro en Wompi usan estos valores al instante.</>}
      />
      <div className="mt-7 flex flex-col gap-3">
        {zones.map((z) => <ZoneRow key={z.code} zone={z} />)}
      </div>
      <div className="mt-6">
        <NewZone taken={zones.map((z) => z.city).filter((c): c is string => Boolean(c))} />
      </div>
    </Page>
  );
}
