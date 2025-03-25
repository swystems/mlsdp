# Velvet Prototype Compiler

This repository contains a prototype compiler for **Velvet**.
It demonstrates a proof-of-concept language/toolchain for experimenting with multi-level data analyses and secure information flow via “budgeted declassification.”

## Overview

This prototype of **Velvet** is a compiler tool that produces C++ source from the (AST of) a program in the format described in the paper "The Art of Letting Go: Formal Declassification with Privacy Budgets."
It is then possible to use a standard C++ compiler (e.g., `clang`) to produce an executable from the generated source.

## Prerequisites

If you choose **not** to use Docker, you will need:
- A recent [Jakt compiler](https://github.com/serenityos/jakt) (for building `main.jakt`).
- A C++23-capable compiler (e.g., clang 16+).
- Python 3.6+, plus the [tqdm](https://pypi.org/project/tqdm/) package (`pip install tqdm`).

If you use the provided Dockerfile, these are already installed as part of the build process.

## Building Velvet

### Local Build (without Docker)

1. Compile the Velvet Compiler
   From the root directory, run:
   ```bash
   jakt -O -o velvet main.jakt
   ```
   This will produce a `build/velvet` binary.

2. Run the Compiler
   You can check that the compiler runs by calling:
   ```bash
   build/velvet wavg
   ```

   This should produce the code for the default example ("wavg") on `stdout`, and some verbose information about the program on `stderr`.

### Docker Build

1. Build the Docker Image
   From this repo’s root folder, run:
   ```bash
   docker build -t velvet-compiler .
   ```
   This should create a Docker image named `velvet-compiler`.

2. Run the 'runit.py' Script
    From the root directory, run:
    ```bash
    docker run --rm -it velvet-compiler
    ```
    This will run the `runit.py` script with some default options (500 repeats, compiled with clang++ 18) and
    display some statistics about the `wavg` and `noisymax` programs.

## Running the Compiler

Currently the compiler can only process hardcoded ASTs, which are defined in the `main.jakt` file.
The available programs are:
- **wavg**: Multi-level weighted average calculation
- **noisymax**: Finding the maximum value under differential privacy constraints

To compile and run a program, use the following command:
```bash
build/velvet PROGRAM_NAME > out.cpp
clang++ -std=c++23 -O3 out.cpp -o out
./out # return code is the output of the algorithm.
```
where `PROGRAM_NAME` is one of the programs listed above.

## Using `runit.py`

The repository also includes a Python script, `runit.py`, which demonstrates repeated compilation and execution of sample programs with timing and accuracy checks.

### Usage

```bash
python3 runit.py [--repeats N] [--cxx-compiler COMPILER] [--velvet-compiler PATH]
```

Example:
```bash
python3 runit.py --repeats 100 \
                 --cxx-compiler clang++ \
                 --velvet-compiler build/velvet
```

## License

This project is provided as a proof-of-concept. All code is licensed under the MIT License (see `LICENSE`).