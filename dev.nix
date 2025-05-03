{ pkgs ? import <nixpkgs> {} }:
let
  inherit (pkgs) stdenv;
  pythonWithPackages = pkgs.python311Full.withPackages (ps: with ps; [
    pip
    numpy
    pandas
    tensorflow
  ]);
in
stdenv.mkDerivation {
  name = "studio-env";
  buildInputs = with pkgs; [
    nodejs
    git
    pythonWithPackages
  ];
}