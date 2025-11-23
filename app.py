from flask import Flask, render_template, request, jsonify
import networkx as nx
import json
import os
from datetime import datetime

app = Flask(__name__)

# Tạo thư mục lưu đồ thị
GRAPHS_FOLDER = 'saved_graphs'
if not os.path.exists(GRAPHS_FOLDER):
    os.makedirs(GRAPHS_FOLDER)

# Lưu trữ đồ thị trong bộ nhớ
graph_data = {
    'graph': nx.Graph(),
    'positions': {},
    'selected_node': None,
    'is_directed': False  # Mặc định là đồ thị vô hướng
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/add_node', methods=['POST'])
def add_node():
    data = request.json
    node_id = data.get('node_id')
    x = data.get('x', 400)
    y = data.get('y', 300)
    
    if node_id and node_id not in graph_data['graph']:
        graph_data['graph'].add_node(node_id)
        graph_data['positions'][node_id] = {'x': x, 'y': y}
        return jsonify({'success': True, 'message': 'Node đã được thêm'})
    
    return jsonify({'success': False, 'message': 'Node đã tồn tại hoặc không hợp lệ'})

@app.route('/api/add_edge', methods=['POST'])
def add_edge():
    data = request.json
    node1 = data.get('node1')
    node2 = data.get('node2')
    weight = data.get('weight', 1)
    
    if node1 in graph_data['graph'] and node2 in graph_data['graph']:
        graph_data['graph'].add_edge(node1, node2, weight=weight)
        return jsonify({'success': True, 'message': 'Cạnh đã được thêm'})
    
    return jsonify({'success': False, 'message': 'Một hoặc cả hai node không tồn tại'})

@app.route('/api/remove_node', methods=['POST'])
def remove_node():
    data = request.json
    node_id = data.get('node_id')
    
    if node_id in graph_data['graph']:
        graph_data['graph'].remove_node(node_id)
        del graph_data['positions'][node_id]
        return jsonify({'success': True, 'message': 'Node đã được xóa'})
    
    return jsonify({'success': False, 'message': 'Node không tồn tại'})

@app.route('/api/get_graph', methods=['GET'])
def get_graph():
    nodes = []
    for node_id in graph_data['graph'].nodes():
        pos = graph_data['positions'].get(node_id, {'x': 400, 'y': 300})
        nodes.append({
            'id': node_id,
            'x': pos['x'],
            'y': pos['y']
        })
    
    edges = []
    for edge in graph_data['graph'].edges():
        weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
        edges.append({
            'source': edge[0],
            'target': edge[1],
            'weight': weight
        })
    
    # Tính thống kê
    num_nodes = graph_data['graph'].number_of_nodes()
    num_edges = graph_data['graph'].number_of_edges()
    
    # Xử lý is_connected cho cả đồ thị có hướng và vô hướng
    is_connected = False
    if num_nodes > 0:
        if graph_data['is_directed']:
            is_connected = nx.is_weakly_connected(graph_data['graph'])
        else:
            is_connected = nx.is_connected(graph_data['graph'])
    
    stats = {
        'num_nodes': num_nodes,
        'num_edges': num_edges,
        'density': nx.density(graph_data['graph']) if num_nodes > 0 else 0,
        'is_connected': is_connected
    }
    
    return jsonify({
        'nodes': nodes,
        'edges': edges,
        'stats': stats,
        'is_directed': graph_data['is_directed']
    })

@app.route('/api/spring_layout', methods=['POST'])
def spring_layout():
    if graph_data['graph'].number_of_nodes() > 0:
        positions = nx.spring_layout(graph_data['graph'], k=1, iterations=50, seed=42)
        for node_id, (x, y) in positions.items():
            graph_data['positions'][node_id] = {
                'x': (x + 1) * 400,
                'y': (y + 1) * 300
            }
        return jsonify({'success': True, 'message': 'Spring layout đã được áp dụng'})
    
    return jsonify({'success': False, 'message': 'Không có node nào'})

@app.route('/api/circular_layout', methods=['POST'])
def circular_layout():
    if graph_data['graph'].number_of_nodes() > 0:
        positions = nx.circular_layout(graph_data['graph'])
        for node_id, (x, y) in positions.items():
            graph_data['positions'][node_id] = {
                'x': (x + 1) * 400,
                'y': (y + 1) * 300
            }
        return jsonify({'success': True, 'message': 'Circular layout đã được áp dụng'})
    
    return jsonify({'success': False, 'message': 'Không có node nào'})

@app.route('/api/clear_all', methods=['POST'])
def clear_all():
    graph_data['graph'].clear()
    graph_data['positions'].clear()
    graph_data['selected_node'] = None
    return jsonify({'success': True, 'message': 'Đã xóa tất cả'})

@app.route('/api/update_position', methods=['POST'])
def update_position():
    data = request.json
    node_id = data.get('node_id')
    x = data.get('x')
    y = data.get('y')
    
    if node_id in graph_data['positions']:
        graph_data['positions'][node_id] = {'x': x, 'y': y}
        return jsonify({'success': True})
    
    return jsonify({'success': False})

@app.route('/api/toggle_directed', methods=['POST'])
def toggle_directed():
    data = request.json
    is_directed = data.get('is_directed', False)
    
    # Lưu vị trí hiện tại
    old_positions = graph_data['positions'].copy()
    
    # Tạo đồ thị mới
    if is_directed:
        new_graph = nx.DiGraph()
    else:
        new_graph = nx.Graph()
    
    # Sao chép nodes và edges
    new_graph.add_nodes_from(graph_data['graph'].nodes())
    for edge in graph_data['graph'].edges(data=True):
        new_graph.add_edge(edge[0], edge[1], **edge[2])
    
    graph_data['graph'] = new_graph
    graph_data['positions'] = old_positions
    graph_data['is_directed'] = is_directed
    
    return jsonify({
        'success': True, 
        'message': f'Đã chuyển sang đồ thị {"có hướng" if is_directed else "vô hướng"}'
    })

@app.route('/api/save_graph', methods=['POST'])
def save_graph():
    try:
        data = request.json
        filename = data.get('filename', f'graph_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        
        # Đảm bảo filename có đuôi .json
        if not filename.endswith('.json'):
            filename += '.json'
        
        # Tạo dữ liệu để lưu
        save_data = {
            'nodes': [],
            'edges': [],
            'is_directed': graph_data['is_directed']
        }
        
        # Lưu nodes với vị trí
        for node_id in graph_data['graph'].nodes():
            pos = graph_data['positions'].get(node_id, {'x': 400, 'y': 300})
            save_data['nodes'].append({
                'id': node_id,
                'x': pos['x'],
                'y': pos['y']
            })
        
        # Lưu edges với trọng số
        for edge in graph_data['graph'].edges():
            weight = graph_data['graph'].get_edge_data(edge[0], edge[1]).get('weight', 1)
            save_data['edges'].append({
                'source': edge[0],
                'target': edge[1],
                'weight': weight
            })
        
        # Lưu file vào thư mục saved_graphs
        filepath = os.path.join(GRAPHS_FOLDER, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'message': f'Đã lưu đồ thị vào {filename}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lưu: {str(e)}'
        })

@app.route('/api/load_graph', methods=['POST'])
def load_graph():
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn file'
            })
        
        # Đọc file từ thư mục saved_graphs
        filepath = os.path.join(GRAPHS_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'message': f'File {filename} không tồn tại'
            })
        
        with open(filepath, 'r', encoding='utf-8') as f:
            graph_file_data = json.load(f)
        
        # Xóa đồ thị hiện tại
        graph_data['graph'].clear()
        graph_data['positions'].clear()
        
        # Tạo đồ thị mới
        is_directed = graph_file_data.get('is_directed', False)
        if is_directed:
            graph_data['graph'] = nx.DiGraph()
        else:
            graph_data['graph'] = nx.Graph()
        
        graph_data['is_directed'] = is_directed
        
        # Thêm nodes
        for node in graph_file_data.get('nodes', []):
            node_id = node['id']
            graph_data['graph'].add_node(node_id)
            graph_data['positions'][node_id] = {
                'x': node.get('x', 400),
                'y': node.get('y', 300)
            }
        
        # Thêm edges
        for edge in graph_file_data.get('edges', []):
            graph_data['graph'].add_edge(
                edge['source'],
                edge['target'],
                weight=edge.get('weight', 1)
            )
        
        return jsonify({
            'success': True,
            'message': f'Đã tải đồ thị {filename} thành công'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi tải: {str(e)}'
        })

@app.route('/api/list_saved_graphs', methods=['GET'])
def list_saved_graphs():
    try:
        files = []
        if os.path.exists(GRAPHS_FOLDER):
            for filename in os.listdir(GRAPHS_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(GRAPHS_FOLDER, filename)
                    files.append({
                        'name': filename,
                        'size': os.path.getsize(filepath),
                        'modified': datetime.fromtimestamp(os.path.getmtime(filepath)).strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        # Sắp xếp theo thời gian sửa đổi (mới nhất trước)
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({
            'success': True,
            'files': files
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lấy danh sách: {str(e)}'
        })

@app.route('/api/delete_saved_graph', methods=['POST'])
def delete_saved_graph():
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn file'
            })
        
        filepath = os.path.join(GRAPHS_FOLDER, filename)
        
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({
                'success': True,
                'message': f'Đã xóa {filename}'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'File {filename} không tồn tại'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi khi xóa: {str(e)}'
        })

@app.route('/api/shortest_path', methods=['POST'])
def shortest_path():
    try:
        data = request.json
        source = data.get('source')
        target = data.get('target')
        
        if not source or not target:
            return jsonify({
                'success': False,
                'message': 'Vui lòng chọn node bắt đầu và node kết thúc'
            })
        
        if source not in graph_data['graph'] or target not in graph_data['graph']:
            return jsonify({
                'success': False,
                'message': 'Node không tồn tại trong đồ thị'
            })
        
        if source == target:
            return jsonify({
                'success': True,
                'path': [source],
                'distance': 0,
                'message': f'Node bắt đầu và kết thúc trùng nhau'
            })
        
        try:
            # Tìm đường đi ngắn nhất sử dụng Dijkstra
            path = nx.shortest_path(graph_data['graph'], source=source, target=target, weight='weight')
            distance = nx.shortest_path_length(graph_data['graph'], source=source, target=target, weight='weight')
            
            return jsonify({
                'success': True,
                'path': path,
                'distance': round(distance, 2),
                'message': f'Đường đi ngắn nhất từ {source} đến {target}: {" → ".join(path)} (độ dài: {round(distance, 2)})'
            })
        except nx.NetworkXNoPath:
            return jsonify({
                'success': False,
                'message': f'Không tìm thấy đường đi từ {source} đến {target}'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        })

if __name__ == '__main__':
    # Thêm một số node mẫu
    graph_data['graph'].add_node('A')
    graph_data['graph'].add_node('B')
    graph_data['graph'].add_node('C')
    graph_data['positions']['A'] = {'x': 200, 'y': 200}
    graph_data['positions']['B'] = {'x': 600, 'y': 200}
    graph_data['positions']['C'] = {'x': 400, 'y': 400}
    graph_data['graph'].add_edge('A', 'B', weight=1)
    graph_data['graph'].add_edge('B', 'C', weight=2)
    graph_data['graph'].add_edge('C', 'A', weight=1.5)
    
    app.run(debug=True, port=5000)
