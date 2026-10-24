import { FormEvent, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { buildWazeFavoriteUrl, buildWazeSearchUrl } from "../services/wazeNavigation";

export function WazeNavigationCard() {
  const [destination, setDestination] = useState("");
  const searchUrl = buildWazeSearchUrl(destination);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (searchUrl) window.open(searchUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="glass rounded-2xl p-4" aria-labelledby="waze-navigation-title">
      <div className="flex items-center gap-2">
        <Navigation className="text-cyanx" size={20} />
        <h3 id="waze-navigation-title" className="font-bold text-white">Navegar com Waze</h3>
      </div>
      <p className="mt-2 text-sm text-slate-400">Informe um endereço ou use um favorito salvo no Waze. No celular, o link abre o app se estiver instalado.</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="waze-destination">Endereço ou destino</label>
        <input
          id="waze-destination"
          className="input min-h-11 flex-1"
          value={destination}
          onChange={(event) => setDestination(event.target.value.slice(0, 300))}
          placeholder="Ex.: Avenida Paulista, São Paulo"
          maxLength={300}
        />
        <button className="btn btn-primary min-h-11" type="submit" disabled={!searchUrl}>
          <MapPin size={17} /> Abrir rota
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn btn-ghost min-h-10" href={buildWazeFavoriteUrl("home")}>
          <Navigation size={16} /> Favorito Casa
        </a>
        <a className="btn btn-ghost min-h-10" href={buildWazeFavoriteUrl("work")}>
          <Navigation size={16} /> Favorito Trabalho
        </a>
      </div>
      <p className="mt-3 text-xs text-slate-500">Os favoritos precisam estar cadastrados no próprio Waze. O JARVIS não recebe nem armazena sua localização.</p>
    </section>
  );
}
