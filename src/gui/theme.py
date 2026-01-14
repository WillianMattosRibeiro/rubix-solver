"""
Theme configuration for the Rubik's Cube Solver GUI.
Implements a dark, minimalist theme inspired by SpaceX/Grok/xAI aesthetics.
"""

import dearpygui.dearpygui as dpg


def setup_theme() -> None:
    """Set up the global dark theme for the application."""
    with dpg.theme() as global_theme:
        with dpg.theme_component(dpg.mvAll):
            # Window and background colors
            dpg.add_theme_color(dpg.mvThemeCol_WindowBg, (10, 10, 10, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ChildBg, (15, 15, 15, 255))
            dpg.add_theme_color(dpg.mvThemeCol_PopupBg, (20, 20, 20, 255))

            # Text colors
            dpg.add_theme_color(dpg.mvThemeCol_Text, (255, 255, 255, 255))
            dpg.add_theme_color(dpg.mvThemeCol_TextDisabled, (128, 128, 128, 255))

            # Border colors
            dpg.add_theme_color(dpg.mvThemeCol_Border, (50, 50, 50, 255))
            dpg.add_theme_color(dpg.mvThemeCol_BorderShadow, (0, 0, 0, 0))

            # Button colors
            dpg.add_theme_color(dpg.mvThemeCol_Button, (30, 30, 30, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (50, 50, 50, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (70, 70, 70, 255))

            # Frame and scrollbar
            dpg.add_theme_color(dpg.mvThemeCol_FrameBg, (20, 20, 20, 255))
            dpg.add_theme_color(dpg.mvThemeCol_FrameBgHovered, (30, 30, 30, 255))
            dpg.add_theme_color(dpg.mvThemeCol_FrameBgActive, (40, 40, 40, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ScrollbarBg, (10, 10, 10, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrab, (50, 50, 50, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrabHovered, (70, 70, 70, 255))
            dpg.add_theme_color(dpg.mvThemeCol_ScrollbarGrabActive, (90, 90, 90, 255))

            # Title and menu
            dpg.add_theme_color(dpg.mvThemeCol_TitleBg, (10, 10, 10, 255))
            dpg.add_theme_color(dpg.mvThemeCol_TitleBgActive, (20, 20, 20, 255))
            dpg.add_theme_color(dpg.mvThemeCol_TitleBgCollapsed, (10, 10, 10, 255))
            dpg.add_theme_color(dpg.mvThemeCol_MenuBarBg, (15, 15, 15, 255))

            # Separator
            dpg.add_theme_color(dpg.mvThemeCol_Separator, (50, 50, 50, 255))
            dpg.add_theme_color(dpg.mvThemeCol_SeparatorHovered, (70, 70, 70, 255))
            dpg.add_theme_color(dpg.mvThemeCol_SeparatorActive, (90, 90, 90, 255))

            # Style settings
            dpg.add_theme_style(dpg.mvStyleVar_WindowRounding, 0)
            dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 0)
            dpg.add_theme_style(dpg.mvStyleVar_GrabRounding, 0)
            dpg.add_theme_style(dpg.mvStyleVar_TabRounding, 0)
            dpg.add_theme_style(dpg.mvStyleVar_WindowBorderSize, 0)
            dpg.add_theme_style(dpg.mvStyleVar_FrameBorderSize, 0)

    dpg.bind_theme(global_theme)