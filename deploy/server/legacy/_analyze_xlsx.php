<?php
require __DIR__ . '/vendor/autoload.php';

$files = [
    'plantillasXLSX/in2.xlsx' => 'Bachillerato (6-9)',
    'plantillasXLSX/in2-media.xlsx' => 'Media (10-11)',
    'plantillasXLSX/in2-primaria.xlsx' => 'Primaria (1-5)',
    'plantillasXLSX/in2-primaria-5.xlsx' => 'Primaria Sede 5',
    'plantillasXLSX/informe-preescolar.xlsx' => 'Preescolar',
];

foreach ($files as $f => $label) {
    $path = __DIR__ . '/' . $f;
    if (!file_exists($path)) {
        echo "=== {$label} ({$f}) ===\nFILE NOT FOUND\n\n";
        continue;
    }
    echo "=== {$label} ({$f}) ===\n";
    
    try {
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
        $sp = $reader->load($path);
        $ws = $sp->getActiveSheet();
        
        echo "Title: {$ws->getTitle()}\n";
        echo "Sheet count: {$sp->getSheetCount()}\n";
        
        echo "\n--- Named Ranges ---\n";
        foreach ($sp->getNamedRanges() as $nr) {
            echo "  {$nr->getName()} -> {$nr->getRange()}\n";
            $data = $ws->getCell($nr->getName())->getValue();
            $dataStr = is_string($data) ? $data : (is_numeric($data) ? (string)$data : '(none)');
            echo "    [data example: {$dataStr}]\n";
        }
        
        echo "\n--- Merged Cells ---\n";
        foreach ($ws->getMergeCells() as $mc) {
            echo "  {$mc}\n";
        }
        
        echo "\n--- Column Dimensions ---\n";
        foreach ($ws->getColumnDimensions() as $cd) {
            $w = $cd->getWidth();
            echo "  {$cd->getColumnIndex()}: w={$w}\n";
        }
        
        echo "\n--- Row Heights ---\n";
        foreach ($ws->getRowDimensions() as $rd) {
            $h = $rd->getRowHeight();
            echo "  Row {$rd->getRowIndex()}: h={$h}\n";
        }
        
        echo "\n--- Content Cells (non-empty) ---\n";
        $cells = [];
        foreach ($ws->getRowIterator(1, 73) as $row) {
            $rowIdx = $row->getRowIndex();
            foreach ($row->getCellIterator('A', 'CE') as $cell) {
                $val = $cell->getValue();
                $col = $cell->getColumn();
                if ($val !== null && $val !== '') {
                    $style = $cell->getStyle();
                    $font = $style->getFont();
                    $align = $style->getAlignment();
                    $v = is_string($val) ? substr(str_replace(["\r","\n"],['\\r','\\n'],$val),0,80) : (is_numeric($val) ? (string)$val : 'obj');
                    $bold = $font->getBold() ? 'B' : '';
                    $sz = $font->getSize() ?? '';
                    $wrap = $align->getWrapText() ? 'W' : '';
                    $ha = $align->getHorizontal() ?? '';
                    $va = $align->getVertical() ?? '';
                    $cells["{$col}{$rowIdx}"] = "  {$col}{$rowIdx}: \"{$v}\" [{$bold} sz{$sz} {$ha}/{$va}]{$wrap}\n";
                }
            }
        }
        ksort($cells);
        foreach ($cells as $c) echo $c;
        
    } catch (Exception $e) {
        echo "Error: {$e->getMessage()}\n";
    }
    echo "\n";
}
