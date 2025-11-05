// app.js - Logic chính của ứng dụng
class FireManagementSystem {
  constructor() {
    this.map = null;
    this.currentMarkers = [];
    this.filteredData = [...fireData];
    this.dangerLevelChart = null;
    this.districtChart = null;
    this.newsChart = null;

    this.init();
  }

  init() {
    this.initializeMap();
    this.initializeEventListeners();
    this.displayFiresOnMap();
    this.updateStatistics();
    this.initializeCharts();
  }

  initializeMap() {
    this.map = L.map("map").setView(mapConfig.center, mapConfig.zoom);

    L.tileLayer(mapConfig.tileLayer, {
      attribution: mapConfig.attribution,
    }).addTo(this.map);
  }

  initializeEventListeners() {
    document
      .getElementById("addFireBtn")
      .addEventListener("click", () => this.addNewFire());
    document
      .getElementById("searchBtn")
      .addEventListener("click", () => this.searchFiresByTime());
    document
      .getElementById("resetSearchBtn")
      .addEventListener("click", () => this.resetSearch());

    // 🔧 Gọi applyFilters() mỗi khi chọn huyện hoặc mức độ
    document
      .getElementById("filterDistrict")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("filterDangerLevel")
      .addEventListener("change", () => this.applyFilters());

    document.getElementById("discoveryTime").value = this.getCurrentDateTime();

    document
      .getElementById("newsUrl")
      .addEventListener("change", (e) => this.validateUrl(e.target));
  }

  validateUrl(input) {
    const url = input.value;
    if (url && !this.isValidUrl(url)) {
      input.style.borderColor = "red";
      document.getElementById("urlError").style.display = "block";
    } else {
      input.style.borderColor = "#ddd";
      document.getElementById("urlError").style.display = "none";
    }
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }

  displayFiresOnMap(fires = this.filteredData) {
    this.currentMarkers.forEach((marker) => this.map.removeLayer(marker));
    this.currentMarkers = [];

    fires.forEach((fire) => {
      const markerColor = this.getColorByDangerLevel(fire.dangerLevel);

      const marker = L.circleMarker(fire.coordinates, {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.7,
        radius: Math.min(Math.sqrt(fire.affectedArea) * 2, 20),
      }).addTo(this.map);

      marker.bindPopup(this.createFirePopupContent(fire));
      marker.bindTooltip(this.createFireTooltip(fire), {
        permanent: false,
        direction: "top",
        className: "custom-tooltip",
        offset: [0, -10],
      });

      if (fire.newsUrl) {
        marker.on("click", () => {
          window.open(fire.newsUrl, "_blank");
        });
      }

      this.currentMarkers.push(marker);
    });
  }

  createFireTooltip(fire) {
    const dangerClass = `danger-${fire.dangerLevel}`;
    const newsInfo = fire.newsUrl
      ? '<div class="tooltip-news">📰 Click để đọc báo</div>'
      : "";

    return `
      <div class="tooltip-title">${fire.name}</div>
      <div class="tooltip-info"><span class="tooltip-label">Địa điểm:</span> ${fire.district}</div>
      <div class="tooltip-info"><span class="tooltip-label">Thời gian:</span> ${this.formatDateTime(fire.discoveryTime)}</div>
      <div class="tooltip-info"><span class="tooltip-label">Mức độ:</span> 
          <span class="${dangerClass}">${this.getDangerLevelText(fire.dangerLevel)}</span>
      </div>
      <div class="tooltip-info"><span class="tooltip-label">Diện tích:</span> ${fire.affectedArea} ha</div>
      <div class="tooltip-info"><span class="tooltip-label">Trạng thái:</span> ${
        fire.status === "active" ? "🔥 Đang hoạt động" : "✅ Đã dập tắt"
      }</div>
      <div class="tooltip-info"><span class="tooltip-label">Nguyên nhân:</span> ${
        fire.cause || "Đang điều tra"
      }</div>
      ${newsInfo}
    `;
  }

  createFirePopupContent(fire) {
    const dangerClass = `danger-${fire.dangerLevel}`;
    const newsButton = fire.newsUrl
      ? `<a href="${fire.newsUrl}" target="_blank" class="news-btn" onclick="event.stopPropagation()">
          <i class="fas fa-newspaper"></i> 📰 Đọc báo về vụ cháy
        </a>`
      : '<div class="no-news">Chưa có thông tin báo chí</div>';

    return `
      <div class="fire-popup">
        <div class="popup-header">
          <h3><i class="fas fa-fire"></i> ${fire.name}</h3>
        </div>
        <div class="popup-content">
          <div class="popup-info"><span class="popup-label">Địa điểm:</span> ${fire.district}</div>
          <div class="popup-info"><span class="popup-label">Thời gian:</span> ${this.formatDateTime(fire.discoveryTime)}</div>
          <div class="popup-info"><span class="popup-label">Mức độ:</span> 
              <span class="${dangerClass}">${this.getDangerLevelText(fire.dangerLevel)}</span>
          </div>
          <div class="popup-info"><span class="popup-label">Diện tích:</span> ${fire.affectedArea} ha</div>
          <div class="popup-info"><span class="popup-label">Trạng thái:</span> ${
            fire.status === "active" ? "🔥 Đang hoạt động" : "✅ Đã dập tắt"
          }</div>
          <div class="popup-info"><span class="popup-label">Nguyên nhân:</span> ${
            fire.cause || "Đang điều tra"
          }</div>
          <div class="news-section">${newsButton}</div>
        </div>
      </div>
    `;
  }

  getColorByDangerLevel(level) {
    return dangerLevels[level]?.color || "gray";
  }

  getDangerLevelText(level) {
    return dangerLevels[level]?.text || "Không xác định";
  }

  formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString("vi-VN");
  }

  addNewFire() {
    const name = document.getElementById("fireName").value;
    const lat = parseFloat(document.getElementById("fireLat").value);
    const lng = parseFloat(document.getElementById("fireLng").value);
    const discoveryTime = document.getElementById("discoveryTime").value;
    const dangerLevel = document.getElementById("dangerLevel").value;
    const affectedArea = parseFloat(document.getElementById("affectedArea").value);
    const district = document.getElementById("fireDistrict").value;
    const cause = document.getElementById("fireCause").value;
    const newsUrl = document.getElementById("newsUrl").value;

    if (!this.validateFireInput(name, lat, lng, discoveryTime, affectedArea, district)) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    if (newsUrl && !this.isValidUrl(newsUrl)) {
      alert("URL báo chí không hợp lệ!");
      return;
    }

    const newFire = {
      id: fireData.length + 1,
      name,
      coordinates: [lat, lng],
      discoveryTime: discoveryTime + ":00",
      dangerLevel,
      affectedArea,
      province: "An Giang",
      status: "active",
      district,
      cause,
      newsUrl,
    };

    fireData.push(newFire);
    this.filteredData = [...fireData];
    this.displayFiresOnMap();
    this.updateStatistics();
    this.updateCharts();
    this.resetForm();

    alert("Đã thêm điểm cháy mới!");
  }

  validateFireInput(name, lat, lng, discoveryTime, affectedArea, district) {
    return name && lat && lng && discoveryTime && affectedArea && district;
  }

  resetForm() {
    document.getElementById("fireName").value = "";
    document.getElementById("fireLat").value = "";
    document.getElementById("fireLng").value = "";
    document.getElementById("discoveryTime").value = this.getCurrentDateTime();
    document.getElementById("affectedArea").value = "";
    document.getElementById("fireDistrict").value = "";
    document.getElementById("fireCause").value = "";
    document.getElementById("newsUrl").value = "";
    document.getElementById("urlError").style.display = "none";
  }

  searchFiresByTime() {
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    if (!startTime || !endTime) {
      alert("Vui lòng chọn khoảng thời gian!");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    this.filteredData = fireData.filter((fire) => {
      const fireTime = new Date(fire.discoveryTime);
      return fireTime >= start && fireTime <= end;
    });

    this.displayFiresOnMap();
    this.updateStatistics();
    this.updateCharts();
  }

  // ✅ HÀM LỌC MỚI: Lọc đồng thời theo huyện & mức độ
  applyFilters() {
    const selectedDistrict = document.getElementById("filterDistrict").value;
    const selectedLevel = document.getElementById("filterDangerLevel").value;

    this.filteredData = fireData.filter((fire) => {
      const matchDistrict = !selectedDistrict || fire.district === selectedDistrict;
      const matchLevel = !selectedLevel || fire.dangerLevel === selectedLevel;
      return matchDistrict && matchLevel;
    });

    this.displayFiresOnMap();
    this.updateStatistics();
    this.updateCharts();
  }

  resetSearch() {
    document.getElementById("startTime").value = "";
    document.getElementById("endTime").value = "";
    document.getElementById("filterDistrict").value = "";
    document.getElementById("filterDangerLevel").value = "";

    this.filteredData = [...fireData];
    this.displayFiresOnMap();
    this.updateStatistics();
    this.updateCharts();
  }

  updateStatistics(fires = this.filteredData) {
    const totalFires = fires.length;
    const activeFires = fires.filter((fire) => fire.status === "active").length;
    const totalArea = fires.reduce((sum, fire) => sum + fire.affectedArea, 0);
    const firesWithNews = fires.filter((fire) => fire.newsUrl).length;

    document.getElementById("totalFires").textContent = totalFires;
    document.getElementById("activeFires").textContent = activeFires;
    document.getElementById("totalArea").textContent = totalArea.toFixed(2);
    document.getElementById("firesWithNews").textContent = firesWithNews;
  }

  initializeCharts() {
    this.createDangerLevelChart();
    this.createDistrictChart();
    this.createNewsChart();
  }

  createDangerLevelChart() {
    const ctx = document.getElementById("dangerLevelChart").getContext("2d");
    const dangerCounts = this.countByDangerLevel();

    this.dangerLevelChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Thấp", "Trung bình", "Cao"],
        datasets: [
          {
            data: [dangerCounts.low, dangerCounts.medium, dangerCounts.high],
            backgroundColor: ["#27ae60", "#f39c12", "#e74c3c"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Phân bố theo mức độ nguy hiểm",
            color: "#ecf0f1",
            font: { size: 14 },
          },
          legend: { labels: { color: "#ecf0f1" } },
        },
      },
    });
  }

  createDistrictChart() {
    const ctx = document.getElementById("districtChart").getContext("2d");
    const districtData = this.countFiresByDistrict();

    this.districtChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(districtData),
        datasets: [
          {
            label: "Số vụ cháy",
            data: Object.values(districtData),
            backgroundColor: "rgba(52, 152, 219, 0.8)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Số vụ cháy theo huyện",
            color: "#ecf0f1",
            font: { size: 14 },
          },
          legend: { labels: { color: "#ecf0f1" } },
        },
        scales: {
          x: {
            ticks: { color: "#ecf0f1" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
          },
          y: {
            ticks: { color: "#ecf0f1" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
          },
        },
      },
    });
  }

  createNewsChart() {
    const ctx = document.getElementById("newsChart").getContext("2d");
    const newsData = this.countFiresWithNews();

    this.newsChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Có thông tin báo chí", "Chưa có thông tin"],
        datasets: [
          {
            data: [newsData.withNews, newsData.withoutNews],
            backgroundColor: ["#3498db", "#95a5a6"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Thông tin báo chí",
            color: "#ecf0f1",
            font: { size: 14 },
          },
          legend: { labels: { color: "#ecf0f1" } },
        },
      },
    });
  }

  countByDangerLevel() {
    return {
      low: this.filteredData.filter((fire) => fire.dangerLevel === "low").length,
      medium: this.filteredData.filter((fire) => fire.dangerLevel === "medium").length,
      high: this.filteredData.filter((fire) => fire.dangerLevel === "high").length,
    };
  }

  countFiresByDistrict() {
    const districtCounts = {};
    districts.forEach((district) => {
      districtCounts[district] = this.filteredData.filter(
        (fire) => fire.district === district
      ).length;
    });
    return districtCounts;
  }

  countFiresWithNews() {
    const fires = this.filteredData;
    return {
      withNews: fires.filter((fire) => fire.newsUrl).length,
      withoutNews: fires.filter((fire) => !fire.newsUrl).length,
    };
  }

  updateCharts() {
    const dangerCounts = this.countByDangerLevel();
    const districtData = this.countFiresByDistrict();
    const newsData = this.countFiresWithNews();

    if (this.dangerLevelChart) {
      this.dangerLevelChart.data.datasets[0].data = [
        dangerCounts.low,
        dangerCounts.medium,
        dangerCounts.high,
      ];
      this.dangerLevelChart.update();
    }

    if (this.districtChart) {
      this.districtChart.data.labels = Object.keys(districtData);
      this.districtChart.data.datasets[0].data = Object.values(districtData);
      this.districtChart.update();
    }

    if (this.newsChart) {
      this.newsChart.data.datasets[0].data = [
        newsData.withNews,
        newsData.withoutNews,
      ];
      this.newsChart.update();
    }
  }
}

// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", () => {
  new FireManagementSystem();
});
