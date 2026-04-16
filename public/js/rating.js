const container = document.getElementById("avg-stars");

if (container) {
    const rating = parseFloat(container.dataset.rating);

    let html = "";

    for (let i = 1; i <= 5; i++) {
        let fill = Math.max(0, Math.min(1, rating - i + 1));

        html += `<span class="star"><span class="star-bg">★</span><span class="star-fill" style="width:${fill * 100}%">★</span></span>`;
    }

    container.innerHTML = html; // ✅ single render (no spacing)
}