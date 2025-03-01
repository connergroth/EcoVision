document.querySelector("form").addEventListener("submit", async function(event) {
    event.preventDefault();
    let formData = new FormData(this);
    let response = await fetch("/predict", {
        method: "POST",
        body: formData
    });
    let result = await response.json();
    alert(`Category: ${result.category}, Recyclable: ${result.recyclable}`);
});
