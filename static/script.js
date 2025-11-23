const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

let graphData = {
    nodes: [],
    edges: [],
    stats: {},
    is_directed: false
};

let selectedNode = null;
let draggingNode = null;
let dragOffset = { x: 0, y: 0 };
let connectingMode = false;
let connectingFromNode = null;
let highlightedPath = []; // Lưu đường đi được highlight
let traversalOrder = []; // Lưu thứ tự duyệt đồ thị
let animationIndex = 0; // Chỉ số animation
let animationInterval = null; // Interval cho animation
let bipartiteColors = {}; // Lưu màu cho đồ thị 2 phía

// Biến cho zoom và pan
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStart = { x: 0, y: 0 };

// Chuyển đổi tọa độ từ màn hình sang canvas (tính đến zoom và pan)
function screenToCanvas(screenX, screenY) {
    return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / scale
    };
}

// Vẽ mũi tên cho đồ thị có hướng
function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headLength = 15; // Độ dài mũi tên
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    // Tính điểm cuối của mũi tên (cách node đích 20px)
    const arrowEndX = toX - Math.cos(angle) * 20;
    const arrowEndY = toY - Math.sin(angle) * 20;
    
    // Vẽ mũi tên
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
        arrowEndX - headLength * Math.cos(angle - Math.PI / 6),
        arrowEndY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        arrowEndX - headLength * Math.cos(angle + Math.PI / 6),
        arrowEndY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

// Tải dữ liệu đồ thị ban đầu
async function loadGraph() {
    try {
        const response = await fetch('/api/get_graph');
        const data = await response.json();
        graphData = data;
        
        console.log('Loaded graph data:', graphData); // Debug
        
        updateStats();
        
        // Cập nhật checkbox
        const checkbox = document.getElementById('directedCheckbox');
        if (checkbox) {
            checkbox.checked = graphData.is_directed || false;
        }
        
        drawGraph();
    } catch (error) {
        console.error('Lỗi khi tải đồ thị:', error);
        showNotification('❌ Không thể tải dữ liệu đồ thị', 'error');
    }
}

// Cập nhật thống kê
function updateStats() {
    if (graphData.stats) {
        document.getElementById('numNodes').textContent = graphData.stats.num_nodes || 0;
        document.getElementById('numEdges').textContent = graphData.stats.num_edges || 0;
        document.getElementById('density').textContent = (graphData.stats.density || 0).toFixed(2);
        document.getElementById('connected').textContent = graphData.stats.is_connected ? 'Có' : 'Không';
    }
}

// Vẽ đồ thị
function drawGraph() {
    // Xóa canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!graphData.nodes || !graphData.edges) {
        console.error('Dữ liệu đồ thị không hợp lệ:', graphData);
        return;
    }
    
    // Lưu trạng thái canvas
    ctx.save();
    
    // Áp dụng transform (zoom và pan)
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Vẽ cạnh
    ctx.lineWidth = 2;
    
    graphData.edges.forEach(edge => {
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
            // Kiểm tra xem cạnh này có nằm trong đường đi ngắn nhất không
            const isInPath = highlightedPath.length > 0 && 
                highlightedPath.some((nodeId, idx) => {
                    if (idx < highlightedPath.length - 1) {
                        return (nodeId === edge.source && highlightedPath[idx + 1] === edge.target);
                    }
                    return false;
                });
            
            // Đổi màu nếu nằm trong đường đi
            ctx.strokeStyle = isInPath ? '#ff6b6b' : '#667eea';
            ctx.lineWidth = isInPath ? 4 : 2;
            
            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.stroke();
            
            // Vẽ mũi tên nếu là đồ thị có hướng
            if (graphData.is_directed) {
                drawArrow(ctx, sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
            }
            
            // Vẽ trọng số
            if (edge.weight !== 1) {
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;
                
                ctx.fillStyle = 'white';
                ctx.fillRect(midX - 15, midY - 10, 30, 20);
                
                ctx.fillStyle = '#28a745';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(edge.weight.toFixed(1), midX, midY);
            }
        }
    });
    
    // Vẽ nodes
    graphData.nodes.forEach(node => {
        const isSelected = selectedNode === node.id;
        const isConnecting = connectingFromNode && connectingFromNode.id === node.id;
        const isInPath = highlightedPath.includes(node.id);
        const isInTraversal = traversalOrder.includes(node.id);
        const traversalIdx = traversalOrder.indexOf(node.id);
        const isCurrentTraversal = traversalIdx >= 0 && traversalIdx < animationIndex;
        const bipartiteColor = bipartiteColors[node.id];
        
        // Vẽ vòng tròn
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        
        if (isConnecting) {
            ctx.fillStyle = '#ffc107'; // Màu vàng khi đang nối
        } else if (bipartiteColor === 0) {
            ctx.fillStyle = '#74c0fc'; // Màu xanh dương cho tập 1
        } else if (bipartiteColor === 1) {
            ctx.fillStyle = '#ffa94d'; // Màu cam cho tập 2
        } else if (isCurrentTraversal) {
            ctx.fillStyle = '#51cf66'; // Màu xanh lá cho node đã duyệt
        } else if (isInPath) {
            ctx.fillStyle = '#ff6b6b'; // Màu đỏ cho đường đi ngắn nhất
        } else if (isSelected) {
            ctx.fillStyle = '#f5576c';
        } else {
            ctx.fillStyle = '#a8dadc';
        }
        
        ctx.fill();
        ctx.strokeStyle = bipartiteColor !== undefined ? '#1971c2' : (isCurrentTraversal ? '#2f9e44' : (isInPath ? '#c92a2a' : (isConnecting ? '#ff6f00' : (isSelected ? '#d62828' : '#457b9d'))));
        ctx.lineWidth = bipartiteColor !== undefined ? 4 : (isCurrentTraversal ? 4 : (isInPath ? 4 : (isConnecting ? 4 : (isSelected ? 3 : 2))));
        ctx.stroke();
        
        // Vẽ số thứ tự duyệt nếu có
        if (isCurrentTraversal) {
            ctx.fillStyle = '#2f9e44';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(traversalIdx + 1, node.x, node.y - 30);
        }
        
        // Vẽ label
        ctx.fillStyle = '#1d3557';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);
    });
    
    // Khôi phục trạng thái canvas
    ctx.restore();
    
    // Hiển thị thông tin hướng dẫn nếu đang ở chế độ nối
    if (connectingMode && connectingFromNode) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 350, 30);
        ctx.fillStyle = '#ffc107';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`🔗 Nhấn Shift + Click vào đỉnh khác để nối với ${connectingFromNode.id}`, 20, 30);
    }
    
    // Hiển thị thông tin zoom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width - 120, canvas.height - 35, 110, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`🔍 Zoom: ${(scale * 100).toFixed(0)}%`, canvas.width - 110, canvas.height - 18);
}

// Chuyển đổi loại đồ thị
async function toggleDirected() {
    const checkbox = document.getElementById('directedCheckbox');
    const isDirected = checkbox.checked;
    
    try {
        const response = await fetch('/api/toggle_directed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_directed: isDirected })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            showNotification('✅ ' + result.message, 'success');
        } else {
            alert('❌ Có lỗi xảy ra');
            checkbox.checked = !isDirected;
        }
    } catch (error) {
        console.error('Lỗi khi chuyển đổi loại đồ thị:', error);
        showNotification('❌ Có lỗi xảy ra', 'error');
        checkbox.checked = !isDirected;
    }
}

// Hiển thị thông báo đẹp
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Thêm node
async function addNode() {
    const nodeId = document.getElementById('nodeId').value.trim();
    
    if (!nodeId) {
        alert('⚠️ Vui lòng nhập mã định danh cho đỉnh (ví dụ: A, B, C...)');
        return;
    }
    
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    
    try {
        const response = await fetch('/api/add_node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId, x: x, y: y })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('nodeId').value = '';
            await loadGraph();
            showNotification('✅ Đã thêm đỉnh ' + nodeId + ' thành công!', 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi thêm đỉnh:', error);
        showNotification('❌ Có lỗi xảy ra khi thêm đỉnh', 'error');
    }
}

// Thêm cạnh
async function addEdge() {
    const node1 = document.getElementById('node1').value.trim();
    const node2 = document.getElementById('node2').value.trim();
    const weight = parseFloat(document.getElementById('weight').value);
    
    if (!node1 || !node2) {
        alert('⚠️ Vui lòng nhập đầy đủ hai đỉnh cần nối (ví dụ: A và B)');
        return;
    }
    
    try {
        const response = await fetch('/api/add_edge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node1: node1, node2: node2, weight: weight })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('node1').value = '';
            document.getElementById('node2').value = '';
            document.getElementById('weight').value = '1';
            await loadGraph();
            showNotification(`✅ Đã nối cạnh ${node1} - ${node2} (trọng số: ${weight})`, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi thêm cạnh:', error);
        showNotification('❌ Có lỗi xảy ra khi thêm cạnh', 'error');
    }
}

// Xóa đỉnh
async function removeNode() {
    const nodeId = document.getElementById('removeNodeId').value.trim();
    
    if (!nodeId) {
        alert('⚠️ Vui lòng nhập đỉnh cần xóa');
        return;
    }
    
    if (!confirm(`⚠️ Bạn có chắc muốn xóa đỉnh ${nodeId}? Tất cả cạnh liên quan sẽ bị xóa.`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/remove_node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('removeNodeId').value = '';
            await loadGraph();
            showNotification('✅ ' + result.message, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi xóa đỉnh:', error);
        showNotification('❌ Có lỗi xảy ra khi xóa đỉnh', 'error');
    }
}

// Xóa cạnh
async function removeEdge() {
    const node1 = document.getElementById('removeEdge1').value.trim();
    const node2 = document.getElementById('removeEdge2').value.trim();
    
    if (!node1 || !node2) {
        alert('⚠️ Vui lòng nhập đầy đủ hai đỉnh');
        return;
    }
    
    if (!confirm(`⚠️ Bạn có chắc muốn xóa cạnh ${node1}-${node2}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/remove_edge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node1: node1, node2: node2 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('removeEdge1').value = '';
            document.getElementById('removeEdge2').value = '';
            await loadGraph();
            showNotification('✅ ' + result.message, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi xóa cạnh:', error);
        showNotification('❌ Có lỗi xảy ra khi xóa cạnh', 'error');
    }
}

// Áp dụng Spring Layout
async function applySpringLayout() {
    try {
        const response = await fetch('/api/spring_layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            showNotification('✅ Đã áp dụng bố cục lò xo thành công!', 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi áp dụng Spring Layout:', error);
        showNotification('❌ Có lỗi xảy ra khi áp dụng bố cục', 'error');
    }
}

// Áp dụng Circular Layout
async function applyCircularLayout() {
    try {
        const response = await fetch('/api/circular_layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            showNotification('✅ Đã áp dụng bố cục vòng tròn thành công!', 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi áp dụng Circular Layout:', error);
        showNotification('❌ Có lỗi xảy ra khi áp dụng bố cục', 'error');
    }
}

// Xóa tất cả
async function clearAll() {
    if (!confirm('⚠️ Bạn có chắc chắn muốn xóa toàn bộ đồ thị không?\n\nHành động này không thể hoàn tác!')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear_all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            selectedNode = null;
            await loadGraph();
            showNotification('✅ Đã xóa toàn bộ đồ thị thành công!', 'success');
        }
    } catch (error) {
        console.error('Lỗi khi xóa tất cả:', error);
        showNotification('❌ Có lỗi xảy ra khi xóa đồ thị', 'error');
    }
}

// Lưu đồ thị
async function saveGraph() {
    const filename = document.getElementById('saveFilename').value.trim();
    
    if (!filename) {
        alert('⚠️ Vui lòng nhập tên file!');
        return;
    }
    
    try {
        const response = await fetch('/api/save_graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('saveModal');
            showNotification('✅ ' + result.message, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi lưu đồ thị:', error);
        showNotification('❌ Có lỗi xảy ra khi lưu đồ thị', 'error');
    }
}

// Hiển thị dialog lưu
function showSaveDialog() {
    const modal = document.getElementById('saveModal');
    const input = document.getElementById('saveFilename');
    input.value = `graph_${new Date().getTime()}`;
    modal.style.display = 'block';
    input.focus();
    input.select();
}

// Hiển thị dialog tải
async function showLoadDialog() {
    const modal = document.getElementById('loadModal');
    modal.style.display = 'block';
    await loadFileList();
}

// Đóng modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Tải danh sách file
async function loadFileList() {
    try {
        const response = await fetch('/api/list_saved_graphs');
        const result = await response.json();
        
        const fileList = document.getElementById('fileList');
        
        if (result.success && result.files.length > 0) {
            fileList.innerHTML = result.files.map(file => `
                <div class="file-item">
                    <div class="file-item-header">
                        <span>📄 ${file.name}</span>
                        <div class="file-item-actions">
                            <button class="btn-load" onclick="loadGraphByName('${file.name}')">Tải</button>
                            <button class="btn-delete" onclick="deleteGraphFile('${file.name}')">Xóa</button>
                        </div>
                    </div>
                    <div class="file-item-info">
                        ${(file.size / 1024).toFixed(2)} KB • ${file.modified}
                    </div>
                </div>
            `).join('');
        } else {
            fileList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Chưa có đồ thị nào được lưu</p>';
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách:', error);
        document.getElementById('fileList').innerHTML = '<p style="text-align: center; color: red;">Có lỗi xảy ra!</p>';
    }
}

// Tải đồ thị theo tên
async function loadGraphByName(filename) {
    try {
        const response = await fetch('/api/load_graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            closeModal('loadModal');
            showNotification('✅ ' + result.message, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi tải đồ thị:', error);
        showNotification('❌ Có lỗi xảy ra khi tải đồ thị', 'error');
    }
}

// Xóa file đồ thị
async function deleteGraphFile(filename) {
    if (!confirm(`⚠️ Bạn có chắc muốn xóa file ${filename}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/delete_saved_graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            await loadFileList();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi xóa file:', error);
        showNotification('❌ Có lỗi xảy ra khi xóa file', 'error');
    }
}

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Tạo node tại vị trí chuột
async function createNodeAtPosition(x, y) {
    const nodeId = prompt('⭐ Nhập tên cho đỉnh mới:');
    
    if (!nodeId || nodeId.trim() === '') {
        return;
    }
    
    try {
        const response = await fetch('/api/add_node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId.trim(), x: x, y: y })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            showNotification(`✅ Đã tạo đỉnh ${nodeId} tại vị trí click!`, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi tạo đỉnh:', error);
        showNotification('❌ Có lỗi xảy ra khi tạo đỉnh', 'error');
    }
}

// Nối hai node với nhau
async function connectNodes(node1, node2) {
    const weight = prompt(`🔗 Nhập trọng số cho cạnh ${node1} - ${node2}:`, '1');
    
    if (weight === null) {
        return; // Người dùng hủy
    }
    
    const weightValue = parseFloat(weight) || 1;
    
    try {
        const response = await fetch('/api/add_edge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node1: node1, node2: node2, weight: weightValue })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGraph();
            showNotification(`✅ Đã nối cạnh ${node1} - ${node2} (trọng số: ${weightValue})`, 'success');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Lỗi khi nối cạnh:', error);
        showNotification('❌ Có lỗi xảy ra khi nối cạnh', 'error');
    }
}

// Cập nhật vị trí node
async function updateNodePosition(nodeId, x, y) {
    try {
        await fetch('/api/update_position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ node_id: nodeId, x: x, y: y })
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật vị trí:', error);
    }
}

// Xử lý sự kiện chuột
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);
    const x = canvasPos.x;
    const y = canvasPos.y;
    
    // Nếu nhấn chuột phải (button 2) hoặc chuột giữa (button 1) - chế độ pan
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        panStart = { x: screenX - offsetX, y: screenY - offsetY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }
    
    // Tìm node được click
    let clickedNode = null;
    for (let node of graphData.nodes) {
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (distance <= 20) {
            clickedNode = node;
            break;
        }
    }
    
    if (clickedNode) {
        // Nếu đang ở chế độ nối cạnh (Shift + Click)
        if (e.shiftKey) {
            if (!connectingFromNode) {
                // Bắt đầu nối từ node này
                connectingFromNode = clickedNode;
                connectingMode = true;
                selectedNode = clickedNode.id;
                showNotification(`🔗 Đang nối từ đỉnh ${clickedNode.id}. Nhấn Shift + Click vào đỉnh khác để hoàn tất`, 'info');
                drawGraph();
            } else if (connectingFromNode.id !== clickedNode.id) {
                // Hoàn tất nối cạnh
                connectNodes(connectingFromNode.id, clickedNode.id);
                connectingFromNode = null;
                connectingMode = false;
            }
            return;
        } else {
            // Chế độ kéo thả bình thường
            connectingFromNode = null;
            connectingMode = false;
            selectedNode = clickedNode.id;
            draggingNode = clickedNode;
            dragOffset = { x: x - clickedNode.x, y: y - clickedNode.y };
            drawGraph();
            return;
        }
    } else {
        // Click vào vùng trống (Ctrl + Click để thêm node mới)
        if (e.ctrlKey) {
            createNodeAtPosition(x, y);
        } else {
            // Hủy chọn
            selectedNode = null;
            connectingFromNode = null;
            connectingMode = false;
            drawGraph();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Xử lý pan
    if (isPanning) {
        offsetX = screenX - panStart.x;
        offsetY = screenY - panStart.y;
        drawGraph();
        return;
    }
    
    // Xử lý kéo node
    if (draggingNode) {
        const canvasPos = screenToCanvas(screenX, screenY);
        const x = canvasPos.x - dragOffset.x;
        const y = canvasPos.y - dragOffset.y;
        
        // Giới hạn trong canvas (tính theo tọa độ canvas gốc)
        draggingNode.x = Math.max(20, Math.min(canvas.width / scale - 20, x));
        draggingNode.y = Math.max(20, Math.min(canvas.height / scale - 20, y));
        
        drawGraph();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    }
    
    if (draggingNode) {
        updateNodePosition(draggingNode.id, draggingNode.x, draggingNode.y);
        draggingNode = null;
    }
});

canvas.addEventListener('mouseleave', () => {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    }
    
    if (draggingNode) {
        updateNodePosition(draggingNode.id, draggingNode.x, draggingNode.y);
        draggingNode = null;
    }
});

// Xử lý zoom bằng scroll chuột
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Tính tọa độ canvas trước khi zoom
    const worldPosBefore = screenToCanvas(mouseX, mouseY);
    
    // Thay đổi scale (deltaY > 0 = cuộn xuống = zoom out)
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = scale * zoomFactor;
    
    // Giới hạn zoom (từ 20% đến 500%)
    if (newScale >= 0.2 && newScale <= 5) {
        scale = newScale;
        
        // Tính lại offset để zoom vào vị trí chuột
        const worldPosAfter = screenToCanvas(mouseX, mouseY);
        
        offsetX += (worldPosAfter.x - worldPosBefore.x) * scale;
        offsetY += (worldPosAfter.y - worldPosBefore.y) * scale;
        
        drawGraph();
    }
}, { passive: false });

// Vô hiệu hóa context menu khi click phải
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Xử lý Enter key
document.getElementById('nodeId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNode();
});

document.getElementById('node1').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('node2').focus();
});

document.getElementById('node2').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('weight').focus();
});

document.getElementById('weight').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addEdge();
});

document.getElementById('sourceNode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('targetNode').focus();
});

document.getElementById('targetNode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') findShortestPath();
});

document.getElementById('traversalStart').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runBFS();
});

// Tìm đường đi ngắn nhất
async function findShortestPath() {
    const source = document.getElementById('sourceNode').value.trim();
    const target = document.getElementById('targetNode').value.trim();
    const resultDiv = document.getElementById('pathResult');
    const resultText = resultDiv.querySelector('p');
    
    // Xóa animation duyệt nếu có
    stopTraversalAnimation();
    
    if (!source || !target) {
        showNotification('⚠️ Vui lòng nhập đỉnh bắt đầu và đỉnh kết thúc', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/shortest_path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, target })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Highlight đường đi
            highlightedPath = result.path;
            drawGraph();
            
            // Hiển thị kết quả
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#d4edda';
            resultDiv.style.borderLeft = '4px solid #28a745';
            resultText.style.color = '#155724';
            resultText.innerHTML = `
                <strong>✅ ${result.message}</strong><br>
                <small>Độ dài: ${result.distance}</small>
            `;
            
            showNotification('✅ Đã tìm thấy đường đi ngắn nhất!', 'success');
        } else {
            // Xóa highlight
            highlightedPath = [];
            drawGraph();
            
            // Hiển thị lỗi
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#f8d7da';
            resultDiv.style.borderLeft = '4px solid #dc3545';
            resultText.style.color = '#721c24';
            resultText.innerHTML = `<strong>❌ ${result.message}</strong>`;
            
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi khi tìm đường đi:', error);
        showNotification('❌ Có lỗi xảy ra khi tìm đường đi', 'error');
    }
}

// Dừng animation duyệt
function stopTraversalAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    traversalOrder = [];
    animationIndex = 0;
}

// Xóa tất cả highlight
function clearAllHighlights() {
    highlightedPath = [];
    bipartiteColors = {};
    stopTraversalAnimation();
}

// BFS - Duyệt theo chiều rộng
async function runBFS() {
    const startNode = document.getElementById('traversalStart').value.trim();
    const resultDiv = document.getElementById('traversalResult');
    const resultText = resultDiv.querySelector('p');
    
    // Xóa highlight đường đi ngắn nhất
    highlightedPath = [];
    stopTraversalAnimation();
    
    if (!startNode) {
        showNotification('⚠️ Vui lòng nhập đỉnh bắt đầu', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/bfs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_node: startNode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Bắt đầu animation
            traversalOrder = result.order;
            animationIndex = 0;
            
            animationInterval = setInterval(() => {
                animationIndex++;
                drawGraph();
                
                if (animationIndex >= traversalOrder.length) {
                    clearInterval(animationInterval);
                    animationInterval = null;
                }
            }, 500); // 500ms mỗi bước
            
            // Hiển thị kết quả
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#d1ecf1';
            resultDiv.style.borderLeft = '4px solid #0c5460';
            resultText.style.color = '#0c5460';
            resultText.innerHTML = `<strong>🔵 ${result.message}</strong>`;
            
            showNotification('✅ Đang thực hiện BFS...', 'success');
        } else {
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#f8d7da';
            resultDiv.style.borderLeft = '4px solid #dc3545';
            resultText.style.color = '#721c24';
            resultText.innerHTML = `<strong>❌ ${result.message}</strong>`;
            
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi khi thực hiện BFS:', error);
        showNotification('❌ Có lỗi xảy ra khi thực hiện BFS', 'error');
    }
}

// DFS - Duyệt theo chiều sâu
async function runDFS() {
    const startNode = document.getElementById('traversalStart').value.trim();
    const resultDiv = document.getElementById('traversalResult');
    const resultText = resultDiv.querySelector('p');
    
    // Xóa highlight đường đi ngắn nhất
    highlightedPath = [];
    stopTraversalAnimation();
    
    if (!startNode) {
        showNotification('⚠️ Vui lòng nhập đỉnh bắt đầu', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/dfs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_node: startNode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Bắt đầu animation
            traversalOrder = result.order;
            animationIndex = 0;
            
            animationInterval = setInterval(() => {
                animationIndex++;
                drawGraph();
                
                if (animationIndex >= traversalOrder.length) {
                    clearInterval(animationInterval);
                    animationInterval = null;
                }
            }, 500); // 500ms mỗi bước
            
            // Hiển thị kết quả
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#d1ecf1';
            resultDiv.style.borderLeft = '4px solid #0c5460';
            resultText.style.color = '#0c5460';
            resultText.innerHTML = `<strong>🟢 ${result.message}</strong>`;
            
            showNotification('✅ Đang thực hiện DFS...', 'success');
        } else {
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#f8d7da';
            resultDiv.style.borderLeft = '4px solid #dc3545';
            resultText.style.color = '#721c24';
            resultText.innerHTML = `<strong>❌ ${result.message}</strong>`;
            
            showNotification('❌ ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Lỗi khi thực hiện DFS:', error);
        showNotification('❌ Có lỗi xảy ra khi thực hiện DFS', 'error');
    }
}

// Kiểm tra đồ thị 2 phía
async function checkBipartite() {
    const resultDiv = document.getElementById('bipartiteResult');
    const resultText = resultDiv.querySelector('p');
    
    // Xóa các highlight khác
    clearAllHighlights();
    
    try {
        const response = await fetch('/api/check_bipartite');
        const result = await response.json();
        
        if (result.success) {
            if (result.is_bipartite) {
                // Highlight 2 tập đỉnh với màu khác nhau
                bipartiteColors = result.color_dict;
                drawGraph();
                
                // Hiển thị kết quả
                resultDiv.style.display = 'block';
                resultDiv.style.background = '#d4edda';
                resultDiv.style.borderLeft = '4px solid #28a745';
                resultText.style.color = '#155724';
                resultText.innerHTML = `<strong>✅ ${result.message}</strong>`;
                
                showNotification('✅ Đây là đồ thị 2 phía!', 'success');
            } else {
                // Xóa highlight
                bipartiteColors = {};
                drawGraph();
                
                // Hiển thị kết quả
                resultDiv.style.display = 'block';
                resultDiv.style.background = '#f8d7da';
                resultDiv.style.borderLeft = '4px solid #dc3545';
                resultText.style.color = '#721c24';
                resultText.innerHTML = `<strong>❌ ${result.message}</strong>`;
                
                showNotification('❌ Không phải đồ thị 2 phía', 'error');
            }
        } else {
            resultDiv.style.display = 'block';
            resultDiv.style.background = '#fff3cd';
            resultDiv.style.borderLeft = '4px solid #ffc107';
            resultText.style.color = '#856404';
            resultText.innerHTML = `<strong>⚠️ ${result.message}</strong>`;
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra đồ thị 2 phía:', error);
        showNotification('❌ Có lỗi xảy ra', 'error');
    }
}

// Hiển thị các biểu diễn đồ thị
async function showRepresentations() {
    try {
        const response = await fetch('/api/get_representations');
        const result = await response.json();
        
        if (!result.success) {
            alert('❌ ' + result.message);
            return;
        }
        
        const nodes = result.nodes;
        const matrix = result.adjacency_matrix;
        const adjList = result.adjacency_list;
        const edgeList = result.edge_list;
        const isDirected = result.is_directed;
        
        // 1. Ma trận kề
        let matrixHTML = '<table style="border-collapse: collapse; margin: 0 auto;">';
        matrixHTML += '<tr><th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;"></th>';
        nodes.forEach(node => {
            matrixHTML += `<th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">${node}</th>`;
        });
        matrixHTML += '</tr>';
        
        nodes.forEach((node, i) => {
            matrixHTML += `<tr><th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">${node}</th>`;
            matrix[i].forEach(val => {
                const cellColor = val > 0 ? '#d4edda' : '#fff';
                matrixHTML += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; background: ${cellColor};">${val}</td>`;
            });
            matrixHTML += '</tr>';
        });
        matrixHTML += '</table>';
        document.getElementById('matrixRepresentation').innerHTML = matrixHTML;
        
        // 2. Danh sách kề
        let listHTML = '<div style="font-family: monospace; line-height: 1.8;">';
        for (const node in adjList) {
            const neighbors = adjList[node];
            if (neighbors.length === 0) {
                listHTML += `<div><strong>${node}:</strong> ∅ (không có đỉnh kề)</div>`;
            } else {
                const neighborStr = neighbors.map(n => 
                    n.weight !== 1 ? `${n.node}(${n.weight})` : n.node
                ).join(', ');
                listHTML += `<div><strong>${node}:</strong> {${neighborStr}}</div>`;
            }
        }
        listHTML += '</div>';
        document.getElementById('listRepresentation').innerHTML = listHTML;
        
        // 3. Danh sách cạnh
        let edgeHTML = '<div style="font-family: monospace; line-height: 1.8;">';
        edgeHTML += `<div style="margin-bottom: 10px;"><strong>Tổng số cạnh:</strong> ${edgeList.length}</div>`;
        edgeHTML += '<table style="border-collapse: collapse; width: 100%;">';
        edgeHTML += `<tr>
            <th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">STT</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">Đỉnh nguồn</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">${isDirected ? '→' : '↔'}</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">Đỉnh đích</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #667eea; color: white;">Trọng số</th>
        </tr>`;
        
        edgeList.forEach((edge, idx) => {
            edgeHTML += `<tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${edge.source}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${isDirected ? '→' : '↔'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${edge.target}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${edge.weight}</td>
            </tr>`;
        });
        edgeHTML += '</table></div>';
        document.getElementById('edgeRepresentation').innerHTML = edgeHTML;
        
        // Hiển thị modal
        document.getElementById('representationModal').style.display = 'block';
        
    } catch (error) {
        console.error('Lỗi khi lấy biểu diễn:', error);
        showNotification('❌ Có lỗi xảy ra', 'error');
    }
}

// Tải đồ thị khi trang load
loadGraph();
