import os
import json
import subprocess
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

HASKELL_EXECUTABLE = "Main.exe"

def call_haskell_engine(input_str):
    """
    Recibe un STRING crudo (sea JSON o DSL) y se lo pasa a Haskell.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    exe_path = os.path.join(current_dir, HASKELL_EXECUTABLE)

    if not os.path.exists(exe_path):
        raise FileNotFoundError(f"No encuentro el archivo '{HASKELL_EXECUTABLE}'")

    process = subprocess.Popen(
        [exe_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8'
    )
    try:
        stdout_data, stderr_data = process.communicate(input=input_str, timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        raise Exception("El motor de Haskell tardó demasiado.")

    if process.returncode != 0:
        raise Exception(f"Error en Haskell: {stderr_data}")

    if not stdout_data.strip():
        raise Exception("Haskell no devolvió datos.")

    try:
        return json.loads(stdout_data)
    except json.JSONDecodeError:
        raise Exception(f"La respuesta de Haskell no es JSON válido: {stdout_data}")


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/decompose', methods=['POST'])
def decompose_api():
    try:
        raw_data = request.get_data(as_text=True)
        
        if not raw_data:
            return jsonify({"error": "Input is empty"}), 400

        print(f"🔄 Enviando input crudo a Haskell ({len(raw_data)} chars)...")
        
        result = call_haskell_engine(raw_data)

        print("✅ Respuesta procesada correctamente.")
        return jsonify(result)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)