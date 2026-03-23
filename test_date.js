const parseDateRobust = (dateStr) => {
    if (!dateStr) return new Date("invalid");
    let normalizada = dateStr.replace(/\//g, '-').trim();

    const partes = normalizada.split('-');
    if (partes.length === 3) {
      if (partes[0].length === 2 && parseInt(partes[0]) > 20) {
        return new Date(`20${partes[0]}-${partes[1]}-${partes[2]}`);
      }
      if (partes[0].length <= 2 && (partes[2].length === 4 || partes[2].length === 2)) {
         let year = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
         return new Date(`${year}-${partes[1]}-${partes[0]}`);
      }
    }
    return new Date(dateStr);
};

const d = parseDateRobust("12-12-25");
console.log(d);
console.log(d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
