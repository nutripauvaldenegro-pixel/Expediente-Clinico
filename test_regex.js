const texto = "SIGNOS VITALES.".toLowerCase().replace(/[.,;:()-\[\]]/g, ' ');
console.log(texto.split(/\s+/));
