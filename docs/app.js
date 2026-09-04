// public/app.js
// No build step needed for this file — it just fetches the JSON that
// build/fetchManifest.mjs generates (weapons.json) plus your hand-edited
// favorites.json, and renders plain HTML. No frameworks, no bundler.

const state = {
  weapons: [],
  favorites: null,
  view: "favorites",
};

async function loadData() {
  const statusEl = document.getElementById("status");
  try {
    const [weaponsRes, favoritesRes] = await Promise.all([
      fetch("data/weapons.json"),
      fetch("data/favorites.json"),
    ]);

    if (!weaponsRes.ok) throw new Error("Could not load weapons.json");
    if (!favoritesRes.ok) throw new Error("Could not load favorites.json");

    state.weapons = await weaponsRes.json();
    state.favorites = await favoritesRes.json();

    statusEl.remove();
    render();
  } catch (err) {
    statusEl.textContent =
      "Failed to load data: " +
      err.message +
      ". Have you run the build script yet? (npm run fetch-manifest)";
    statusEl.classList.add("error");
  }
}

function weaponByHash(hash) {
  return state.weapons.find((w) => w.hash === hash);
}

function weaponCard(weapon, note) {
  const card = document.createElement("div");
  card.className = "weapon-card";
  card.innerHTML = `
    <img src="${weapon.icon}" alt="${weapon.name}" loading="lazy" />
    <div>
      <h3>${weapon.name}</h3>
      <p>${weapon.weaponType} &middot; ${weapon.damageType} &middot; ${weapon.slot}</p>
      <p>${weapon.tier}</p>
      ${note ? `<p class="note">${note}</p>` : ""}
    </div>
  `;
  return card;
}

function renderFavorites() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (!state.favorites.favoriteWeapons.length) {
    app.innerHTML = "<p>No favorites added yet. Edit data/favorites.json.</p>";
    return;
  }

  const list = document.createElement("div");
  list.className = "weapon-list";

  for (const fav of state.favorites.favoriteWeapons) {
    const weapon = weaponByHash(fav.hash);
    if (!weapon) continue; // hash not found — probably a typo or removed item
    list.appendChild(weaponCard(weapon, fav.note));
  }

  app.appendChild(list);
}

function renderLoadouts() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (!state.favorites.loadouts.length) {
    app.innerHTML = "<p>No loadouts added yet. Edit data/favorites.json.</p>";
    return;
  }

  for (const loadout of state.favorites.loadouts) {
    const section = document.createElement("div");
    section.className = "loadout";

    const list = document.createElement("div");
    list.className = "weapon-list";
    for (const hash of loadout.weaponHashes) {
      const weapon = weaponByHash(hash);
      if (weapon) list.appendChild(weaponCard(weapon));
    }

    section.innerHTML = `
      <h3>${loadout.name}</h3>
      <p>${loadout.description || ""}</p>
    `;
    section.appendChild(list);
    app.appendChild(section);
  }
}

function renderAll() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const list = document.createElement("div");
  list.className = "weapon-list";
  for (const weapon of state.weapons) {
    list.appendChild(weaponCard(weapon));
  }
  app.appendChild(list);
}

function render() {
  if (state.view === "favorites") renderFavorites();
  else if (state.view === "loadouts") renderLoadouts();
  else renderAll();
}

document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.view = btn.dataset.view;
    render();
  });
});

loadData();
