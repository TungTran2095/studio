{
  pkgs ? import <nixpkgs> {}
}:

let
  pythonEnv = pkgs.python311.withPackages (ps: with ps; [
    pip
    tensorflow  # Cài TensorFlow từ pip thay vì qua Nix
    pandas
    scikit-learn
    numpy
    python-dotenv
    lightgbm
    # Supabase và Darts cài bằng pip
  ]);
in

pkgs.mkShell {
  buildInputs = [
    pythonEnv
    pkgs.git
  ];

  shellHook = ''
    echo "✅ Đang vào môi trường phát triển Python 3.11 (Nix + pip)"
    
    if [ ! -d .venv ]; then
      echo "📦 Chưa có virtualenv, đang tạo..."
      python -m venv .venv
    fi

    source .venv/bin/activate
    echo "📂 Đã kích hoạt môi trường ảo .venv"

    # Cài các gói pip chưa có trong nixpkgs
    pip install --upgrade pip
    pip install supabase darts
  '';
}
