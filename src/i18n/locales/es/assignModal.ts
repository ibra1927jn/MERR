import type { TranslationDict } from '../../types';

const assignModal: TranslationDict = {
    'assignModal.title': 'Fila {row}',
    'assignModal.subtitle': '{occupiedCount}/{totalRows} filas asignadas',
    'assignModal.team_leader': 'Líder de Equipo',
    'assignModal.bucket_runner': 'Corredor de Cubetas',
    'assignModal.side': 'Lado',
    'assignModal.side.north': 'Norte',
    'assignModal.side.south': 'Sur',
    'assignModal.select_leader': 'Seleccionar líder...',
    'assignModal.select_runner': 'Seleccionar corredor (opcional)...',
    'assignModal.confirm': 'Confirmar Asignación',
    'assignModal.confirm_n_rows': 'Asignar {n} Filas',
    'assignModal.assigning': 'Asignando...',
    'assignModal.people_on_row_one': '{n} persona en la fila',
    'assignModal.people_on_row_other': '{n} personas en la fila',
    'assignModal.teams_on_row': '{n} equipo en fila {row}',
    'assignModal.teams_on_row_plural': '{n} equipos en fila {row}',
    // Grilla de selección de filas
    'assignModal.selected_one': '{n} fila seleccionada',
    'assignModal.selected_other': '{n} filas seleccionadas',
    'assignModal.block_rows': '{blockName} — Filas',
};

export default assignModal;
